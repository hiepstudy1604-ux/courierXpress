import React, { useEffect, useMemo, useState } from "react";
import { AlertCircle, DollarSign, Loader2, Package, Plus, Trash2, Upload, X } from "lucide-react";
import { User } from "../types";
import { CourierService, ProvinceService, WardService } from "../services/api";

type ServiceType = "STANDARD" | "EXPRESS" | null;
type ExpressSize = "S" | "M" | "L" | "XL" | null;
type PickupSlot = "ca1" | "ca2" | "";
type InspectionPolicy = "NO_VIEW" | "VIEW_NO_TRY" | "VIEW_AND_TRY" | "";
type PaymentMethod = "CASH" | "TRANSFER" | "";

type AddressInfo = {
    name: string;
    phone: string;
    address_detail: string;
    province_code: string;
    province_name: string;
    ward_code: string;
    ward_name: string;
};

type ProductItem = {
    id: string;
    name: string;
    weight_g: number;
    length_cm?: number;
    width_cm?: number;
    height_cm?: number;
    express_size?: ExpressSize;
    category: string;
    declared_value: number;
    images: File[];
    imagePreviews: string[];
};

type FormData = {
    sender: AddressInfo;
    receiver: AddressInfo;
    service_type: ServiceType;
    products: ProductItem[];
    pickup_date: string;
    pickup_slot: PickupSlot;
    inspection_policy: InspectionPolicy;
    payment_method: PaymentMethod;
    note: string;
    idempotency_key?: string;
};

type PricingBreakdown = {
    estimated_fee: number;
    base_price: number;
    extra_weight_price: number;
    route_type: string;
    vehicle_type: string;
    sla: string;
    chargeable_weight?: number;
    actual_weight?: number;
    volumetric_weight?: number;
};

const initialAddressInfo: AddressInfo = {
    name: "",
    phone: "",
    address_detail: "",
    province_code: "",
    province_name: "",

    ward_code: "",
    ward_name: "",
};

const MAX_SHIPMENT_WEIGHT_KG = 30;
const MAX_SHIPMENT_WEIGHT_G = MAX_SHIPMENT_WEIGHT_KG * 1000;

const initialFormData: FormData = {
    sender: { ...initialAddressInfo },
    receiver: { ...initialAddressInfo },
    service_type: null,
    products: [],
    pickup_date: "",
    pickup_slot: "",
    inspection_policy: "NO_VIEW",
    payment_method: "",
    note: "",
};

const productCategories = [
    "High-end fashion goods",
    "Food and beverages",
    "Stationery and small office equipment",
    "Electronic technology devices",
    "High-value fragile goods",
    "Decorative furniture",
    "Construction materials",
    "Vehicles",
    "Personal items and small-scale home/office moving",
];

interface Props {
    user: User;
    setView?: (view: any) => void;
}

interface Province {
    province_code: string;
    province_name: string;
    province_type: string;
    region_code: string;
}

interface Ward {
    ward_code: string;
    ward_name: string;
    ward_name_raw: string;
    ward_type: string;
    province_code: string;
}

const testSender: AddressInfo = {
    name: "Nguyen Van An",
    phone: "0987654321",
    address_detail: "123 ABC Street, Dich Vong Hau Ward",
    province_code: "",
    province_name: "Hanoi",
    ward_code: "",
    ward_name: "Dich Vong Hau Ward",
};

const testReceiver: AddressInfo = {
    name: "Tran Thi Binh",
    phone: "0912345678",
    address_detail: "456 XYZ Street, Ben Nghe Ward",
    province_code: "",
    province_name: "Ho Chi Minh City",
    ward_code: "",
    ward_name: "Ben Nghe Ward",
};

const testProduct: ProductItem = {
    id: "test-product-1",
    name: "Advanced Programming Books",
    weight_g: 500,
    length_cm: 20,
    width_cm: 15,
    height_cm: 5,
    category: "Stationery and small office equipment",
    declared_value: 150000,
    images: [],
    imagePreviews: [],
};

const getTestFormData = (): FormData => ({
    sender: testSender,
    receiver: testReceiver,
    service_type: "STANDARD",
    products: [testProduct],
    pickup_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split("T")[0], // Tomorrow's date
    pickup_slot: "ca1",
    inspection_policy: "VIEW_NO_TRY",
    payment_method: "CASH",
    note: "Delivery during business hours. Please call ahead.",
    idempotency_key: `idemp_test_${Date.now()}`,
});

export function CreateShipment({ setView }: Props) {
    // Main form state for the entire create-shipment flow (Step 1 + Step 2).
    const [formData, setFormData] = useState<FormData>(initialFormData);

    // Wizard step:
    // - 1: fill in shipment details
    // - 2: show fee and ask for confirmation
    const [currentStep, setCurrentStep] = useState<1 | 2>(1);

    // Field-level validation errors collected on Step 1.
    const [errors, setErrors] = useState<Record<string, string>>({});

    // Global submitting flag used to disable buttons/spinners while calling APIs.
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Error message to show at the top of the page (API/validation-related).
    const [submitError, setSubmitError] = useState<string | null>(null);

    // Pricing returned by the backend after creating the draft order.
    const [pricingBreakdown, setPricingBreakdown] = useState<PricingBreakdown | null>(null);

    // Backend identifiers used for confirming the order and showing success info.
    const [orderId, setOrderId] = useState<string | null>(null);
    const [trackingCode, setTrackingCode] = useState<string>("");

    // Controls the success modal visibility after confirmation.
    const [showSuccessModal, setShowSuccessModal] = useState(false);

    const [provinces, setProvinces] = useState<Province[]>([]);
    const [isLoadingProvinces, setIsLoadingProvinces] = useState(false);
    const [senderWards, setSenderWards] = useState<Ward[]>([]);
    const [receiverWards, setReceiverWards] = useState<Ward[]>([]);
    const [isLoadingSenderWards, setIsLoadingSenderWards] = useState(false);
    const [isLoadingReceiverWards, setIsLoadingReceiverWards] = useState(false);

    useEffect(() => {
        // Generate a unique idempotency key for this form submission
        // - Date.now(): adds a timestamp (ms) to reduce collision risk
        // - Math.random().toString(36): creates a short random base36 string (0-9, a-z)
        // - slice(2, 11): removes "0." and takes 9 chars for a compact random part
        // Example: "idemp_1706412345678_k3p9x1abc
        const key = `idemp_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;

        // Update formData safely using functional state update:
        // - prev ensures we always get the latest state
        // - spread keeps all existing fields, only sets/overwrites idempotency_key
        // Purpose: backend can use this key to prevent duplicate processing
        // (e.g., user double-clicks submit or request is retried).
        setFormData((prev) => ({ ...prev, idempotency_key: key }));
    }, []); // Run once when the component is mounted (empty dependency array [])

    // Load all provinces once. District/Ward options are fetched lazily based on selections.
    useEffect(() => {
        // Fetch all provinces from the API.
        // This is a one-time operation that only needs to be done when the component mounts.
        // The provinces are stored in the `provinces` state variable.
        // The `provinces` state variable is used to display the province dropdown in the UI.
        const fetchProvinces = async () => {
            // Try to fetch the provinces from the API.
            try {
                // Set the `isLoadingProvinces` state variable to true to display a loading spinner in the UI.
                setIsLoadingProvinces(true);
                const response = await ProvinceService.getAll();
                // If the request is successful, the provinces are stored in the `provinces` state variable.
                if (response.data && response.data.success) {
                    setProvinces(response.data.data || []);
                } else {
                    // If the request is unsuccessful, the `provinces` state variable is set to an empty array.
                    setProvinces([]);
                }
            } catch {
                // If the request is unsuccessful, the `provinces` state variable is set to an empty array.
                setProvinces([]);
            } finally {
                // Set the `isLoadingProvinces` state variable to false to hide the loading spinner in the UI.
                setIsLoadingProvinces(false);
            }
        };

        fetchProvinces();
    }, []);

    useEffect(() => {
        const fetchSenderWards = async () => {
            if (!formData.sender.province_code) {
                setSenderWards([]);
                return;
            }

            const province_code = formData.sender.province_code;

            try {
                setIsLoadingSenderWards(true);
                const response = await WardService.getAll({ province_code });
                if (response.data.success) {
                    setSenderWards(response.data.data);
                } else {
                    setSenderWards([]);
                }
            } catch {
                setSenderWards([]);
            } finally {
                setIsLoadingSenderWards(false);
            }
        };

        fetchSenderWards();
    }, [formData.sender.province_code]);

    useEffect(() => {
        const fetchReceiverWards = async () => {
            if (!formData.receiver.province_code) {
                setReceiverWards([]);
                return;
            }

            const province_code = formData.receiver.province_code;

            try {
                setIsLoadingReceiverWards(true);
                const response = await WardService.getAll({ province_code });
                if (response.data.success) {
                    setReceiverWards(response.data.data);
                } else {
                    setReceiverWards([]);
                }
            } catch {
                setReceiverWards([]);
            } finally {
                setIsLoadingReceiverWards(false);
            }
        };

        fetchReceiverWards();
    }, [formData.receiver.province_code]);

    // When province changes, reset district/ward because they depend on the selected province.
    const handleSenderProvinceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const selectedProvinceCode = e.target.value;
        const selectedProvince = provinces.find((p) => p.province_code === selectedProvinceCode);

        setFormData((prev) => ({
            ...prev,
            sender: {
                ...prev.sender,
                province_code: selectedProvinceCode,
                province_name: selectedProvince?.province_name || "",
                ward_code: "",
                ward_name: "",
            },
        }));
    };

    // When province changes, reset district/ward because they depend on the selected province.
    const handleReceiverProvinceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const selectedProvinceCode = e.target.value;
        const selectedProvince = provinces.find((p) => p.province_code === selectedProvinceCode);

        setFormData((prev) => ({
            ...prev,
            receiver: {
                ...prev.receiver,
                province_code: selectedProvinceCode,
                province_name: selectedProvince?.province_name || "",
                ward_code: "",
                ward_name: "",
            },
        }));
    };

    const goBackToPreviousStep = () => {
        if (currentStep === 2 && !isSubmitting) {
            setCurrentStep(1);
            setSubmitError(null);
        }
    };

    // Validate all required inputs for Step 1.
    // Returns true if valid; otherwise sets `errors` state and returns false.
    const validateStep1 = (): boolean => {
        const newErrors: Record<string, string> = {};

        if (!formData.sender.name.trim()) newErrors.sender_name = "Sender name is required";
        {
            const phone = formData.sender.phone.trim();
            if (!phone) newErrors.sender_phone = "Sender phone number is required";
            else if (!/^(0|\+84)[0-9]{9,10}$/.test(phone)) newErrors.sender_phone = "Invalid phone number";
        }
        if (!formData.sender.address_detail.trim()) newErrors.sender_address_detail = "Detailed address is required";
        if (!formData.sender.ward_code.trim()) newErrors.sender_ward = "Ward is required";
        if (!formData.sender.province_code.trim()) newErrors.sender_province = "Province/City is required";

        if (!formData.receiver.name.trim()) newErrors.receiver_name = "Receiver name is required";
        {
            const phone = formData.receiver.phone.trim();
            if (!phone) newErrors.receiver_phone = "Receiver phone number is required";
            else if (!/^(0|\+84)[0-9]{9,10}$/.test(phone)) newErrors.receiver_phone = "Invalid phone number";
        }
        if (!formData.receiver.address_detail.trim())
            newErrors.receiver_address_detail = "Detailed address is required";
        if (!formData.receiver.ward_code.trim()) newErrors.receiver_ward = "Ward is required";
        if (!formData.receiver.province_code.trim()) newErrors.receiver_province = "Province/City is required";

        // Sender/Receiver must not be the same person.
        // Block if:
        // - Same phone number (normalized)
        // - OR same address (address_detail + ward + province), normalized to avoid false positives
        const normalizePhone = (p: string) => p.replace(/[^0-9+]/g, "").trim();
        const normalizeText = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");

        const senderPhoneNorm = normalizePhone(formData.sender.phone);
        const receiverPhoneNorm = normalizePhone(formData.receiver.phone);
        if (senderPhoneNorm && receiverPhoneNorm && senderPhoneNorm === receiverPhoneNorm) {
            newErrors.receiver_phone = "Receiver phone number must be different from sender";
        }

        const senderAddressKey = [
            normalizeText(formData.sender.address_detail),
            normalizeText(formData.sender.ward_name || formData.sender.ward_code),
            normalizeText(formData.sender.province_name || formData.sender.province_code),
        ].join("|");

        const receiverAddressKey = [
            normalizeText(formData.receiver.address_detail),
            normalizeText(formData.receiver.ward_name || formData.receiver.ward_code),
            normalizeText(formData.receiver.province_name || formData.receiver.province_code),
        ].join("|");

        // Only compare when both sides are fully present (otherwise avoid noisy errors during typing)
        const hasSenderAddress =
            !!formData.sender.address_detail.trim() &&
            !!(formData.sender.ward_name || formData.sender.ward_code).trim() &&
            !!(formData.sender.province_name || formData.sender.province_code).trim();

        const hasReceiverAddress =
            !!formData.receiver.address_detail.trim() &&
            !!(formData.receiver.ward_name || formData.receiver.ward_code).trim() &&
            !!(formData.receiver.province_name || formData.receiver.province_code).trim();

        if (hasSenderAddress && hasReceiverAddress && senderAddressKey === receiverAddressKey) {
            newErrors.receiver_address_detail = "Receiver address must be different from sender";
        }

        if (!formData.service_type) newErrors.service_type = "Please select a service type";

        if (formData.products.length === 0) {
            newErrors.products = "Please add at least 1 item";
        }

        formData.products.forEach((product, index) => {
            if (!product.name.trim()) newErrors[`product_name_${index}`] = "Item name is required";
            if (product.weight_g <= 0) newErrors[`product_weight_${index}`] = "Weight must be greater than 0";
            if (product.weight_g > MAX_SHIPMENT_WEIGHT_G) {
                newErrors[`product_weight_${index}`] = `Weight must not exceed ${MAX_SHIPMENT_WEIGHT_KG} kg`;
            }

            if (formData.service_type === "STANDARD") {
                if (!product.length_cm || product.length_cm <= 0)
                    newErrors[`product_length_${index}`] = "Length is required";
                if (!product.width_cm || product.width_cm <= 0)
                    newErrors[`product_width_${index}`] = "Width is required";
                if (!product.height_cm || product.height_cm <= 0)
                    newErrors[`product_height_${index}`] = "Height is required";
            } else if (formData.service_type === "EXPRESS") {
                if (!product.express_size) newErrors[`product_size_${index}`] = "Please select a size";
            }

            if (!product.category) newErrors[`product_category_${index}`] = "Please select an item category";
            if (product.declared_value <= 0)
                newErrors[`product_value_${index}`] = "Declared value must be greater than 0";
            if (product.declared_value > 10000000) {
                newErrors[`product_value_${index}`] =
                    "Declared value exceeds the maximum insured amount (10,000,000 VND)";
            }

            if (!product.images || product.images.length === 0) {
                newErrors[`product_images_${index}`] = "Please upload at least 1 image for this item";
            }
        });

        if (!formData.pickup_date) {
            newErrors.pickup_date = "Pickup date is required";
        } else {
            const [yStr, mStr, dStr] = formData.pickup_date.split("-");
            const y = Number(yStr);
            const m = Number(mStr);
            const d = Number(dStr);
            const pickupDate = new Date(y, m - 1, d);

            const today = new Date();
            today.setHours(0, 0, 0, 0);

            if (Number.isNaN(pickupDate.getTime())) {
                newErrors.pickup_date = "Pickup date is invalid";
            } else if (pickupDate < today) {
                newErrors.pickup_date = "Pickup date must be today or later";
            }
        }

        if (!formData.pickup_slot) newErrors.pickup_slot = "Pickup slot is required";
        if (!formData.payment_method) newErrors.payment_method = "Payment method is required";

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // Add a new empty item row. Fields differ by service type:
    // - STANDARD: dimensions are required
    // - EXPRESS: size (S/M/L/XL) is required
    const addProduct = () => {
        const newProduct: ProductItem = {
            id: Date.now().toString(),
            name: "",
            weight_g: 0,
            category: "",
            declared_value: 0,
            images: [],
            imagePreviews: [],
        };

        if (formData.service_type === "STANDARD") {
            newProduct.length_cm = 0;
            newProduct.width_cm = 0;
            newProduct.height_cm = 0;
        } else if (formData.service_type === "EXPRESS") {
            newProduct.express_size = null;
        }

        setFormData((prev) => ({ ...prev, products: [...prev.products, newProduct] }));
    };

    const removeProduct = (id: string) => {
        setFormData((prev) => {
            const target = prev.products.find((p) => p.id === id);
            if (target) {
                revokePreviewUrls(target.imagePreviews);
            }

            return { ...prev, products: prev.products.filter((p) => p.id !== id) };
        });
    };

    const updateProduct = (id: string, updates: Partial<ProductItem>) => {
        setFormData((prev) => ({
            ...prev,
            products: prev.products.map((p) => (p.id === id ? { ...p, ...updates } : p)),
        }));
    };

    const revokePreviewUrls = (urls: string[]) => {
        urls.forEach((url) => {
            if (typeof url === "string" && url.startsWith("blob:")) {
                try {
                    URL.revokeObjectURL(url);
                } catch {
                    // ignore
                }
            }
        });
    };

    // Handle multi-image upload for a given product.
    // - Limits each item to max 4 images
    // - Uses URL.createObjectURL for previews (must revoke to prevent memory leaks)
    const handleProductImageUpload = (productId: string, e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);

        if (e.target) {
            e.target.value = "";
        }

        if (files.length === 0) return;

        const product = formData.products.find((p) => p.id === productId);
        if (!product) return;

        const currentImageCount = product.images.length;
        const remainingSlots = 4 - currentImageCount;
        if (remainingSlots <= 0) {
            setSubmitError("Each item can upload up to 4 images");
            return;
        }

        const filesToAdd = files.slice(0, remainingSlots);
        const previewUrlsToAdd = filesToAdd.map((file) => URL.createObjectURL(file));

        setFormData((prev) => ({
            ...prev,
            products: prev.products.map((p) =>
                p.id === productId
                    ? {
                          ...p,
                          images: [...p.images, ...filesToAdd],
                          imagePreviews: [...p.imagePreviews, ...previewUrlsToAdd],
                      }
                    : p,
            ),
        }));

        if (files.length > remainingSlots) {
            setSubmitError(`You can only add up to ${remainingSlots} more image(s) (max 4 images per item)`);
            setTimeout(() => setSubmitError(null), 3000);
        }
    };

    const removeProductImage = (productId: string, imageIndex: number) => {
        setFormData((prev) => {
            const target = prev.products.find((p) => p.id === productId);
            if (!target) return prev;

            const previewToRemove = target.imagePreviews[imageIndex];
            if (previewToRemove) {
                revokePreviewUrls([previewToRemove]);
            }

            return {
                ...prev,
                products: prev.products.map((p) =>
                    p.id === productId
                        ? {
                              ...p,
                              images: p.images.filter((_, i) => i !== imageIndex),
                              imagePreviews: p.imagePreviews.filter((_, i) => i !== imageIndex),
                          }
                        : p,
                ),
            };
        });
    };

    // Step 1 submit:
    // Calls create-order endpoint to get a quotation (estimated fee) before final confirmation.
    const handleStep1Submit = async () => {
        if (isSubmitting) return;
        if (!validateStep1()) return;

        const submissionKey = `idemp_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
        setFormData((prev) => ({ ...prev, idempotency_key: submissionKey }));

        setIsSubmitting(true);
        setSubmitError(null);

        try {
            const payload = {
                sender: {
                    name: formData.sender.name,
                    phone: formData.sender.phone,
                    address_detail: formData.sender.address_detail,
                    province: formData.sender.province_name || formData.sender.province_code,
                    ward: formData.sender.ward_name || formData.sender.ward_code,
                },
                receiver: {
                    name: formData.receiver.name,
                    phone: formData.receiver.phone,
                    address_detail: formData.receiver.address_detail,
                    province: formData.receiver.province_name || formData.receiver.province_code,
                    ward: formData.receiver.ward_name || formData.receiver.ward_code,
                },
                service_type: formData.service_type,
                items: formData.products.map((product) => {
                    const item: any = {
                        name: product.name,
                        weight_g: product.weight_g,
                        category: product.category,
                        declared_value: product.declared_value,
                    };

                    if (formData.service_type === "STANDARD") {
                        item.length_cm = product.length_cm;
                        item.width_cm = product.width_cm;
                        item.height_cm = product.height_cm;
                    } else if (formData.service_type === "EXPRESS") {
                        item.express_size = product.express_size;
                    }

                    return item;
                }),
                pickup_date: formData.pickup_date,
                pickup_slot: formData.pickup_slot,
                inspection_policy: formData.inspection_policy,
                payment_method: formData.payment_method,
                note: formData.note || "",
                idempotency_key: formData.idempotency_key,
            };

            const response = await CourierService.quote(payload);

            if (response.data.success) {
                setOrderId(null);
                setTrackingCode("");
                setPricingBreakdown({
                    estimated_fee: response.data.data.estimated_fee,
                    base_price: response.data.data.pricing_breakdown?.base_price || 0,
                    extra_weight_price: response.data.data.pricing_breakdown?.extra_weight_price || 0,
                    route_type: response.data.data.pricing_breakdown?.route_type || "",
                    vehicle_type: response.data.data.pricing_breakdown?.vehicle_type || "",
                    sla: response.data.data.pricing_breakdown?.sla || "",
                    chargeable_weight: response.data.data.pricing_breakdown?.chargeable_weight,
                    actual_weight: response.data.data.pricing_breakdown?.actual_weight,
                    volumetric_weight: response.data.data.pricing_breakdown?.volumetric_weight,
                });
                setCurrentStep(2);
            } else {
                setSubmitError(response.data.message || "Unable to calculate quotation");
            }
        } catch (error: any) {
            const formatApiErrorMessage = (err: any): string => {
                const data = err?.response?.data;

                if (typeof data?.message === "string" && data.message.trim()) {
                    if (data.message !== "Validation failed") return data.message;
                }

                const errorsObj = data?.errors;
                if (errorsObj && typeof errorsObj === "object") {
                    const parts: string[] = [];

                    Object.entries(errorsObj).forEach(([field, messages]) => {
                        if (Array.isArray(messages)) {
                            const msg = messages.filter(Boolean).join(", ");
                            if (msg) parts.push(`${field}: ${msg}`);
                        } else if (typeof messages === "string" && messages.trim()) {
                            parts.push(`${field}: ${messages}`);
                        }
                    });

                    if (parts.length > 0) {
                        return `Validation failed: ${parts.join(" | ")}`;
                    }
                }

                const fallback = err?.message;
                if (typeof fallback === "string" && fallback.trim()) return fallback;

                return "Unable to create order. Please try again.";
            };

            setSubmitError(formatApiErrorMessage(error));
        } finally {
            setIsSubmitting(false);
        }
    };

    // Step 2 submit:
    // Confirms the previously created order (locks in the quotation and finalizes booking).
    const handleConfirmOrder = async () => {
        if (isSubmitting) return;

        setIsSubmitting(true);
        setSubmitError(null);

        try {
            const submissionKey = `idemp_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;

            const payload = {
                sender: {
                    name: formData.sender.name,
                    phone: formData.sender.phone,
                    address_detail: formData.sender.address_detail,
                    province: formData.sender.province_name || formData.sender.province_code,
                    ward: formData.sender.ward_name || formData.sender.ward_code,
                },
                receiver: {
                    name: formData.receiver.name,
                    phone: formData.receiver.phone,
                    address_detail: formData.receiver.address_detail,
                    province: formData.receiver.province_name || formData.receiver.province_code,
                    ward: formData.receiver.ward_name || formData.receiver.ward_code,
                },
                service_type: formData.service_type,
                items: formData.products.map((product) => {
                    const item: any = {
                        name: product.name,
                        weight_g: product.weight_g,
                        category: product.category,
                        declared_value: product.declared_value,
                    };

                    if (formData.service_type === "STANDARD") {
                        item.length_cm = product.length_cm;
                        item.width_cm = product.width_cm;
                        item.height_cm = product.height_cm;
                    } else if (formData.service_type === "EXPRESS") {
                        item.express_size = product.express_size;
                    }

                    return item;
                }),
                pickup_date: formData.pickup_date,
                pickup_slot: formData.pickup_slot,
                inspection_policy: formData.inspection_policy,
                payment_method: formData.payment_method,
                note: formData.note || "",
                idempotency_key: submissionKey,
            };

            const createRes = await CourierService.create(payload);
            if (!createRes.data.success) {
                setSubmitError(createRes.data.message || "Unable to create order");
                return;
            }

            const createdOrderId = createRes.data.data.order_id;
            const createdTrackingCode = createRes.data.data.tracking_code;
            setOrderId(createdOrderId);
            setTrackingCode(createdTrackingCode);

            const confirmRes = await CourierService.confirmOrder(createdOrderId);
            if (confirmRes.data.success) {
                setShowSuccessModal(true);
            } else {
                setSubmitError(confirmRes.data.message || "Unable to confirm order");
            }
        } catch (error: any) {
            setSubmitError(error.response?.data?.message || "Unable to confirm order. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const resetToStep1 = () => {
        revokePreviewUrls(formData.products.flatMap((p) => p.imagePreviews));

        const newKey = `idemp_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
        setFormData({ ...initialFormData, idempotency_key: newKey });
        setCurrentStep(1);
        setOrderId(null);
        setTrackingCode("");
        setPricingBreakdown(null);
        setSubmitError(null);
        setErrors({});
        setSenderWards([]);
        setReceiverWards([]);
    };

    const totalWeightG = useMemo(
        () => formData.products.reduce((sum, p) => sum + (p.weight_g || 0), 0),
        [formData.products],
    );

    // keep flow on the page; show modal instead of replacing the whole view

    // Success modal primary action:
    // - Closes the modal
    // - Navigates user to the "Booked" shipments view
    // - Triggers an optional refresh hook if the hosting shell provides it
    const handleModalConfirm = () => {
        setShowSuccessModal(false);

        // Navigate to "Booked" tab and refresh (if supported by the host).
        if (setView) {
            setView("SHIPMENTS_BOOKED");
            setTimeout(() => {
                try {
                    (window as any).refreshShipmentsBooked?.({ trackingCode, orderId });
                } catch {
                    // ignore
                }
            }, 50);
        }
    };

    // Timeline configuration for the two-step wizard UI.
    // The UI highlights:
    // - "active" steps (<= currentStep)
    // - the current step (ring highlight)
    const timelineSteps = [
        { number: 1, label: "Input details", icon: Package },
        { number: 2, label: "Quotation", icon: DollarSign },
    ];

    return (
        // Page container for the create-shipment wizard.
        // Layout notes:
        // - centered with max width
        // - bottom padding to avoid overlapping sticky elements / mobile browser bars
        // - entry animation for a smoother first render
        <div className="max-w-7xl mx-auto px-4 lg:px-6 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Success modal shown after the order is confirmed.
          UX goals:
          - Clearly communicates success state
          - Shows key identifiers (trackingCode / orderId)
          - Provides a single clear next action (go to Booked)
      */}
            {showSuccessModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/40" onClick={() => setShowSuccessModal(false)} />
                    <div className="relative w-full max-w-xl bg-white rounded-[24px] shadow-2xl border border-slate-200 p-6">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <h2 className="text-xl font-black text-slate-900">Order created successfully</h2>
                                <p className="text-sm text-slate-500 mt-1">
                                    Please confirm to continue to the Booked tab.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowSuccessModal(false)}
                                className="p-2 rounded-xl hover:bg-slate-100 text-slate-500"
                                aria-label="Close"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="mt-5 grid grid-cols-1 gap-3">
                            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                                <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
                                    Tracking ID
                                </p>
                                <p className="text-2xl font-black text-[#f97316] mt-1">{trackingCode || "—"}</p>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="bg-white border border-slate-200 rounded-2xl p-4">
                                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
                                        Order ID
                                    </p>
                                    <p className="text-sm font-bold text-slate-900 mt-1 break-all">{orderId || "—"}</p>
                                </div>
                                <div className="bg-white border border-slate-200 rounded-2xl p-4">
                                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
                                        Estimated fee
                                    </p>
                                    <p className="text-sm font-bold text-slate-900 mt-1">
                                        {pricingBreakdown?.estimated_fee != null
                                            ? `${pricingBreakdown.estimated_fee.toLocaleString("en-US")} VND`
                                            : "—"}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="mt-6 flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setShowSuccessModal(false)}
                                className="px-5 py-3 rounded-xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200 transition-all"
                            >
                                Close
                            </button>
                            <button
                                type="button"
                                onClick={handleModalConfirm}
                                className="px-6 py-3 rounded-xl bg-[#f97316] text-white font-black shadow-lg hover:bg-[#ea580c] transition-all"
                            >
                                Confirm
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Timeline / progress indicator for the 2-step wizard.
          Visual rules:
          - Active steps (already completed or current) are orange
          - Current step has an extra ring highlight
      */}
            <div className="mb-8">
                <div className="flex items-center justify-center gap-4">
                    {timelineSteps.map((step, index) => {
                        const StepIcon = step.icon;
                        const isActive = currentStep >= step.number;
                        const isCurrent = currentStep === step.number;

                        return (
                            <React.Fragment key={step.number}>
                                <div className="flex flex-col items-center">
                                    <div
                                        className={`w-12 h-12 rounded-full flex items-center justify-center font-black text-sm transition-all ${
                                            isActive
                                                ? "bg-[#f97316] text-white shadow-lg"
                                                : "bg-slate-200 text-slate-400"
                                        } ${isCurrent ? "ring-4 ring-orange-200" : ""}`}
                                    >
                                        {isActive ? <StepIcon size={20} /> : <span>{step.number}</span>}
                                    </div>
                                    <span
                                        className={`mt-2 text-xs font-bold ${isActive ? "text-slate-900" : "text-slate-400"}`}
                                    >
                                        {step.label}
                                    </span>
                                </div>
                                {index < timelineSteps.length - 1 && (
                                    <div className="w-16 h-0.5 bg-slate-200 rounded" />
                                )}
                            </React.Fragment>
                        );
                    })}
                </div>
            </div>

            {/* Global error banner. Used for API failures and other non-field-specific errors. */}
            {submitError && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
                    <AlertCircle className="text-red-500 mt-0.5" size={18} />
                    <p className="text-red-600 text-sm">{submitError}</p>
                </div>
            )}

            {/* Step 1: Input details
          - Sender + receiver addresses
          - Service options (service type, pickup date/slot, payment, inspection)
          - Package/item list with conditional fields based on service type
          Submitting Step 1 calls the create-order API to return a quotation.
      */}
            {currentStep === 1 && (
                <div className="space-y-6">
                    {import.meta.env.DEV && (
                        <div className="flex items-center justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => {
                                    const data = getTestFormData();
                                    setFormData(data);
                                    setErrors({});
                                    setSubmitError(null);
                                }}
                                className="px-4 py-2 rounded-xl bg-slate-900 text-white font-bold text-sm hover:bg-black transition-all"
                            >
                                Fill Test Data
                            </button>
                            <button
                                type="button"
                                onClick={() => resetToStep1()}
                                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold text-sm hover:bg-slate-200 transition-all"
                            >
                                Reset
                            </button>
                        </div>
                    )}
                    <div className="bg-white rounded-[24px] border border-slate-200 shadow-sm p-6">
                        <h2 className="text-2xl font-black text-slate-900 mb-6 flex items-center gap-2">
                            <Package size={24} className="text-[#f97316]" />
                            Order information
                        </h2>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <h3 className="font-black text-slate-900">Sender</h3>

                                <div className="space-y-1">
                                    <label
                                        htmlFor="sender-name"
                                        className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1"
                                    >
                                        Sender name
                                    </label>
                                    <input
                                        id="sender-name"
                                        className="w-full px-4 py-3 border border-slate-200 rounded-xl"
                                        value={formData.sender.name}
                                        onChange={(e) =>
                                            setFormData((prev) => ({
                                                ...prev,
                                                sender: { ...prev.sender, name: e.target.value },
                                            }))
                                        }
                                        placeholder="Sender name"
                                    />
                                    {errors.sender_name && <p className="text-xs text-red-600">{errors.sender_name}</p>}
                                </div>

                                <div className="space-y-1">
                                    <label
                                        htmlFor="sender-phone"
                                        className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1"
                                    >
                                        Phone number
                                    </label>
                                    <input
                                        id="sender-phone"
                                        className="w-full px-4 py-3 border border-slate-200 rounded-xl"
                                        value={formData.sender.phone}
                                        onChange={(e) =>
                                            setFormData((prev) => ({
                                                ...prev,
                                                sender: { ...prev.sender, phone: e.target.value },
                                            }))
                                        }
                                        placeholder="Phone number"
                                    />
                                    {errors.sender_phone && (
                                        <p className="text-xs text-red-600">{errors.sender_phone}</p>
                                    )}
                                </div>

                                <div className="space-y-1">
                                    <label
                                        htmlFor="sender-address-detail"
                                        className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1"
                                    >
                                        Detailed address
                                    </label>
                                    <input
                                        id="sender-address-detail"
                                        className="w-full px-4 py-3 border border-slate-200 rounded-xl"
                                        value={formData.sender.address_detail}
                                        onChange={(e) =>
                                            setFormData((prev) => ({
                                                ...prev,
                                                sender: { ...prev.sender, address_detail: e.target.value },
                                            }))
                                        }
                                        placeholder="Detailed address"
                                    />
                                    {errors.sender_address_detail && (
                                        <p className="text-xs text-red-600">{errors.sender_address_detail}</p>
                                    )}
                                </div>

                                <div className="space-y-1">
                                    <label
                                        htmlFor="sender-province"
                                        className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1"
                                    >
                                        Province/City
                                    </label>
                                    <select
                                        id="sender-province"
                                        className="w-full px-4 py-3 border border-slate-200 rounded-xl"
                                        value={formData.sender.province_code}
                                        onChange={handleSenderProvinceChange}
                                    >
                                        <option value="">Select province/city</option>
                                        {isLoadingProvinces ? (
                                            <option disabled>Loading...</option>
                                        ) : (
                                            provinces.map((p) => (
                                                <option key={p.province_code} value={p.province_code}>
                                                    {p.province_name}
                                                </option>
                                            ))
                                        )}
                                    </select>
                                    {errors.sender_province && (
                                        <p className="text-xs text-red-600">{errors.sender_province}</p>
                                    )}
                                </div>

                                <div className="space-y-1">
                                    <label
                                        htmlFor="sender-ward"
                                        className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1"
                                    >
                                        Ward
                                    </label>
                                    <select
                                        id="sender-ward"
                                        className="w-full px-4 py-3 border border-slate-200 rounded-xl"
                                        value={formData.sender.ward_code}
                                        onChange={(e) => {
                                            const wardCode = e.target.value;
                                            const ward = senderWards.find((w) => w.ward_code === wardCode);

                                            setFormData((prev) => ({
                                                ...prev,
                                                sender: {
                                                    ...prev.sender,
                                                    ward_code: wardCode,
                                                    ward_name: ward?.ward_name || "",
                                                },
                                            }));
                                        }}
                                        disabled={!formData.sender.province_code || isLoadingSenderWards}
                                    >
                                        <option value="">Select ward</option>
                                        {senderWards.map((w) => (
                                            <option key={w.ward_code} value={w.ward_code}>
                                                {w.ward_name}
                                            </option>
                                        ))}
                                    </select>
                                    {errors.sender_ward && <p className="text-xs text-red-600">{errors.sender_ward}</p>}
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h3 className="font-black text-slate-900">Receiver</h3>

                                <div className="space-y-1">
                                    <label
                                        htmlFor="receiver-name"
                                        className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1"
                                    >
                                        Receiver name
                                    </label>
                                    <input
                                        id="receiver-name"
                                        className="w-full px-4 py-3 border border-slate-200 rounded-xl"
                                        value={formData.receiver.name}
                                        onChange={(e) =>
                                            setFormData((prev) => ({
                                                ...prev,
                                                receiver: { ...prev.receiver, name: e.target.value },
                                            }))
                                        }
                                        placeholder="Receiver name"
                                    />
                                    {errors.receiver_name && (
                                        <p className="text-xs text-red-600">{errors.receiver_name}</p>
                                    )}
                                </div>

                                <div className="space-y-1">
                                    <label
                                        htmlFor="receiver-phone"
                                        className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1"
                                    >
                                        Phone number
                                    </label>
                                    <input
                                        id="receiver-phone"
                                        className="w-full px-4 py-3 border border-slate-200 rounded-xl"
                                        value={formData.receiver.phone}
                                        onChange={(e) =>
                                            setFormData((prev) => ({
                                                ...prev,
                                                receiver: { ...prev.receiver, phone: e.target.value },
                                            }))
                                        }
                                        placeholder="Phone number"
                                    />
                                    {errors.receiver_phone && (
                                        <p className="text-xs text-red-600">{errors.receiver_phone}</p>
                                    )}
                                </div>

                                <div className="space-y-1">
                                    <label
                                        htmlFor="receiver-address-detail"
                                        className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1"
                                    >
                                        Detailed address
                                    </label>
                                    <input
                                        id="receiver-address-detail"
                                        className="w-full px-4 py-3 border border-slate-200 rounded-xl"
                                        value={formData.receiver.address_detail}
                                        onChange={(e) =>
                                            setFormData((prev) => ({
                                                ...prev,
                                                receiver: { ...prev.receiver, address_detail: e.target.value },
                                            }))
                                        }
                                        placeholder="Detailed address"
                                    />
                                    {errors.receiver_address_detail && (
                                        <p className="text-xs text-red-600">{errors.receiver_address_detail}</p>
                                    )}
                                </div>

                                <div className="space-y-1">
                                    <label
                                        htmlFor="receiver-province"
                                        className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1"
                                    >
                                        Province/City
                                    </label>
                                    <select
                                        id="receiver-province"
                                        className="w-full px-4 py-3 border border-slate-200 rounded-xl"
                                        value={formData.receiver.province_code}
                                        onChange={handleReceiverProvinceChange}
                                    >
                                        <option value="">Select province/city</option>
                                        {isLoadingProvinces ? (
                                            <option disabled>Loading...</option>
                                        ) : (
                                            provinces.map((p) => (
                                                <option key={p.province_code} value={p.province_code}>
                                                    {p.province_name}
                                                </option>
                                            ))
                                        )}
                                    </select>
                                    {errors.receiver_province && (
                                        <p className="text-xs text-red-600">{errors.receiver_province}</p>
                                    )}
                                </div>

                                <div className="space-y-1">
                                    <label
                                        htmlFor="receiver-ward"
                                        className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1"
                                    >
                                        Ward
                                    </label>
                                    <select
                                        id="receiver-ward"
                                        className="w-full px-4 py-3 border border-slate-200 rounded-xl"
                                        value={formData.receiver.ward_code}
                                        onChange={(e) => {
                                            const wardCode = e.target.value;
                                            const ward = receiverWards.find((w) => w.ward_code === wardCode);

                                            setFormData((prev) => ({
                                                ...prev,
                                                receiver: {
                                                    ...prev.receiver,
                                                    ward_code: wardCode,
                                                    ward_name: ward?.ward_name || "",
                                                },
                                            }));
                                        }}
                                        disabled={!formData.receiver.province_code || isLoadingReceiverWards}
                                    >
                                        <option value="">Select ward</option>
                                        {receiverWards.map((w) => (
                                            <option key={w.ward_code} value={w.ward_code}>
                                                {w.ward_name}
                                            </option>
                                        ))}
                                    </select>
                                    {errors.receiver_ward && (
                                        <p className="text-xs text-red-600">{errors.receiver_ward}</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-4">
                            <div className="space-y-1">
                                <label
                                    htmlFor="service-type"
                                    className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1"
                                >
                                    Service type
                                </label>
                                <select
                                    id="service-type"
                                    className="w-full px-4 py-3 border border-slate-200 rounded-xl"
                                    value={formData.service_type || ""}
                                    onChange={(e) => {
                                        const value = e.target.value as ServiceType;

                                        setFormData((prev) => {
                                            if (prev.service_type === value) return prev;

                                            const migratedProducts = prev.products.map((product) => {
                                                if (value === "STANDARD") {
                                                    const { express_size, ...rest } = product;
                                                    return {
                                                        ...rest,
                                                        length_cm: product.length_cm ?? 0,
                                                        width_cm: product.width_cm ?? 0,
                                                        height_cm: product.height_cm ?? 0,
                                                    };
                                                }

                                                if (value === "EXPRESS") {
                                                    const { length_cm, width_cm, height_cm, ...rest } = product;
                                                    return {
                                                        ...rest,
                                                        express_size: product.express_size ?? null,
                                                    };
                                                }

                                                return product;
                                            });

                                            return {
                                                ...prev,
                                                service_type: value,
                                                products: migratedProducts,
                                            };
                                        });
                                    }}
                                >
                                    <option value="">Select service type</option>
                                    <option value="STANDARD">STANDARD</option>
                                    <option value="EXPRESS">EXPRESS</option>
                                </select>
                                {errors.service_type && <p className="text-xs text-red-600">{errors.service_type}</p>}
                            </div>

                            <div className="space-y-1">
                                <label
                                    htmlFor="pickup-date"
                                    className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1"
                                >
                                    Pickup date
                                </label>
                                <input
                                    id="pickup-date"
                                    className="w-full px-4 py-3 border border-slate-200 rounded-xl"
                                    type="date"
                                    value={formData.pickup_date}
                                    onChange={(e) => setFormData((prev) => ({ ...prev, pickup_date: e.target.value }))}
                                />
                                {errors.pickup_date && <p className="text-xs text-red-600">{errors.pickup_date}</p>}
                            </div>

                            <div className="space-y-1">
                                <label
                                    htmlFor="pickup-slot"
                                    className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1"
                                >
                                    Pickup slot
                                </label>
                                <select
                                    id="pickup-slot"
                                    className="w-full px-4 py-3 border border-slate-200 rounded-xl"
                                    value={formData.pickup_slot}
                                    onChange={(e) =>
                                        setFormData((prev) => ({ ...prev, pickup_slot: e.target.value as PickupSlot }))
                                    }
                                >
                                    <option value="">Select pickup slot</option>
                                    <option value="ca1">Slot 1</option>
                                    <option value="ca2">Slot 2</option>
                                </select>
                                {errors.pickup_slot && <p className="text-xs text-red-600">{errors.pickup_slot}</p>}
                            </div>

                            <div className="space-y-1">
                                <label
                                    htmlFor="payment-method"
                                    className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1"
                                >
                                    Payment method
                                </label>
                                <select
                                    id="payment-method"
                                    className="w-full px-4 py-3 border border-slate-200 rounded-xl"
                                    value={formData.payment_method}
                                    onChange={(e) =>
                                        setFormData((prev) => ({
                                            ...prev,
                                            payment_method: e.target.value as PaymentMethod,
                                        }))
                                    }
                                >
                                    <option value="">Select payment method</option>
                                    <option value="CASH">Cash</option>
                                    <option value="TRANSFER">Bank transfer</option>
                                </select>
                                {errors.payment_method && (
                                    <p className="text-xs text-red-600">{errors.payment_method}</p>
                                )}
                            </div>

                            <div className="space-y-1">
                                <label
                                    htmlFor="inspection-policy"
                                    className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1"
                                >
                                    Inspection policy
                                </label>
                                <select
                                    id="inspection-policy"
                                    className="w-full px-4 py-3 border border-slate-200 rounded-xl"
                                    value={formData.inspection_policy}
                                    onChange={(e) =>
                                        setFormData((prev) => ({
                                            ...prev,
                                            inspection_policy: e.target.value as InspectionPolicy,
                                        }))
                                    }
                                >
                                    <option value="NO_VIEW">No viewing</option>
                                    <option value="VIEW_NO_TRY">View only (no try)</option>
                                    <option value="VIEW_AND_TRY">View and try</option>
                                </select>
                            </div>

                            <div className="space-y-1">
                                <label
                                    htmlFor="note"
                                    className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1"
                                >
                                    Notes
                                </label>
                                <input
                                    id="note"
                                    className="w-full px-4 py-3 border border-slate-200 rounded-xl"
                                    value={formData.note}
                                    onChange={(e) => setFormData((prev) => ({ ...prev, note: e.target.value }))}
                                    placeholder="Notes (optional)"
                                />
                            </div>
                        </div>

                        <div className="mt-8">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-black text-slate-900">Items</h3>
                                <button
                                    type="button"
                                    onClick={addProduct}
                                    disabled={!formData.service_type}
                                    className="px-4 py-2 bg-slate-900 text-white rounded-xl font-bold flex items-center gap-2 disabled:opacity-50"
                                >
                                    <Plus size={16} />
                                    Add item
                                </button>
                            </div>

                            {errors.products && <p className="text-xs text-red-600 mb-3">{errors.products}</p>}

                            <p className="text-xs text-slate-500 mb-3">Total: {(totalWeightG / 1000).toFixed(2)} kg</p>

                            <div className="space-y-4">
                                {formData.products.map((product, index) => (
                                    <div key={product.id} className="border border-slate-200 rounded-2xl p-4">
                                        <div className="flex items-center justify-between mb-3">
                                            <p className="font-black text-slate-900">Item #{index + 1}</p>
                                            <button
                                                aria-label={`Delete item ${index + 1}`}
                                                type="button"
                                                onClick={() => removeProduct(product.id)}
                                                className="p-2 rounded-xl bg-red-50 text-red-600"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>

                                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                                            <div className="space-y-1">
                                                <label
                                                    htmlFor={`product-name-${product.id}`}
                                                    className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1"
                                                >
                                                    Item name
                                                </label>
                                                <input
                                                    id={`product-name-${product.id}`}
                                                    className="w-full px-4 py-3 border border-slate-200 rounded-xl"
                                                    value={product.name}
                                                    onChange={(e) =>
                                                        updateProduct(product.id, { name: e.target.value })
                                                    }
                                                    placeholder="Item name"
                                                />
                                                {errors[`product_name_${index}`] && (
                                                    <p className="text-xs text-red-600">
                                                        {errors[`product_name_${index}`]}
                                                    </p>
                                                )}
                                            </div>

                                            <div className="space-y-1">
                                                <div className="flex justify-between items-end">
                                                    <label
                                                        htmlFor={`product-weight-${product.id}`}
                                                        className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1"
                                                    >
                                                        Weight (g)
                                                    </label>
                                                    <span className="text-xs text-slate-500">
                                                        Max: {MAX_SHIPMENT_WEIGHT_KG}kg
                                                    </span>
                                                </div>
                                                <input
                                                    id={`product-weight-${product.id}`}
                                                    className="w-full px-4 py-3 border border-slate-200 rounded-xl"
                                                    type="number"
                                                    value={product.weight_g}
                                                    onChange={(e) =>
                                                        updateProduct(product.id, { weight_g: Number(e.target.value) })
                                                    }
                                                    placeholder="Weight (g)"
                                                    min={0}
                                                    max={MAX_SHIPMENT_WEIGHT_G}
                                                />
                                                <div className="flex justify-between text-xs text-slate-500">
                                                    <span>{(product.weight_g / 1000).toFixed(2)} kg</span>
                                                    <span>{product.weight_g}g</span>
                                                </div>
                                                {errors[`product_weight_${index}`] && (
                                                    <p className="text-xs text-red-600">
                                                        {errors[`product_weight_${index}`]}
                                                    </p>
                                                )}
                                            </div>

                                            <div className="space-y-1">
                                                <label
                                                    htmlFor={`product-declared-value-${product.id}`}
                                                    className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1"
                                                >
                                                    Declared value (VND)
                                                </label>
                                                <input
                                                    id={`product-declared-value-${product.id}`}
                                                    className="w-full px-4 py-3 border border-slate-200 rounded-xl"
                                                    type="number"
                                                    value={product.declared_value}
                                                    onChange={(e) =>
                                                        updateProduct(product.id, {
                                                            declared_value: Number(e.target.value),
                                                        })
                                                    }
                                                    placeholder="Declared value (VND)"
                                                    min={0}
                                                />
                                                {errors[`product_value_${index}`] && (
                                                    <p className="text-xs text-red-600">
                                                        {errors[`product_value_${index}`]}
                                                    </p>
                                                )}
                                            </div>

                                            {formData.service_type === "STANDARD" && (
                                                <>
                                                    <div className="space-y-1">
                                                        <label
                                                            htmlFor={`product-length-${product.id}`}
                                                            className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1"
                                                        >
                                                            Length (cm)
                                                        </label>
                                                        <input
                                                            id={`product-length-${product.id}`}
                                                            className="w-full px-4 py-3 border border-slate-200 rounded-xl"
                                                            type="number"
                                                            value={product.length_cm ?? 0}
                                                            onChange={(e) =>
                                                                updateProduct(product.id, {
                                                                    length_cm: Number(e.target.value),
                                                                })
                                                            }
                                                            placeholder="Length (cm)"
                                                            min={0}
                                                        />
                                                        {errors[`product_length_${index}`] && (
                                                            <p className="text-xs text-red-600">
                                                                {errors[`product_length_${index}`]}
                                                            </p>
                                                        )}
                                                    </div>

                                                    <div className="space-y-1">
                                                        <label
                                                            htmlFor={`product-width-${product.id}`}
                                                            className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1"
                                                        >
                                                            Width (cm)
                                                        </label>
                                                        <input
                                                            id={`product-width-${product.id}`}
                                                            className="w-full px-4 py-3 border border-slate-200 rounded-xl"
                                                            type="number"
                                                            value={product.width_cm ?? 0}
                                                            onChange={(e) =>
                                                                updateProduct(product.id, {
                                                                    width_cm: Number(e.target.value),
                                                                })
                                                            }
                                                            placeholder="Width (cm)"
                                                            min={0}
                                                        />
                                                        {errors[`product_width_${index}`] && (
                                                            <p className="text-xs text-red-600">
                                                                {errors[`product_width_${index}`]}
                                                            </p>
                                                        )}
                                                    </div>

                                                    <div className="space-y-1">
                                                        <label
                                                            htmlFor={`product-height-${product.id}`}
                                                            className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1"
                                                        >
                                                            Height (cm)
                                                        </label>
                                                        <input
                                                            id={`product-height-${product.id}`}
                                                            className="w-full px-4 py-3 border border-slate-200 rounded-xl"
                                                            type="number"
                                                            value={product.height_cm ?? 0}
                                                            onChange={(e) =>
                                                                updateProduct(product.id, {
                                                                    height_cm: Number(e.target.value),
                                                                })
                                                            }
                                                            placeholder="Height (cm)"
                                                            min={0}
                                                        />
                                                        {errors[`product_height_${index}`] && (
                                                            <p className="text-xs text-red-600">
                                                                {errors[`product_height_${index}`]}
                                                            </p>
                                                        )}
                                                    </div>
                                                </>
                                            )}

                                            {formData.service_type === "EXPRESS" && (
                                                <div className="space-y-1">
                                                    <select
                                                        aria-label="Package size for express shipping"
                                                        className="w-full px-4 py-3 border border-slate-200 rounded-xl"
                                                        value={product.express_size || ""}
                                                        onChange={(e) =>
                                                            updateProduct(product.id, {
                                                                express_size: e.target.value as ExpressSize,
                                                            })
                                                        }
                                                    >
                                                        <option value="">Select size</option>
                                                        <option value="S">S</option>
                                                        <option value="M">M</option>
                                                        <option value="L">L</option>
                                                        <option value="XL">XL</option>
                                                    </select>
                                                    {errors[`product_size_${index}`] && (
                                                        <p className="text-xs text-red-600">
                                                            {errors[`product_size_${index}`]}
                                                        </p>
                                                    )}
                                                </div>
                                            )}

                                            <div className="space-y-1">
                                                <select
                                                    aria-label="Item category"
                                                    className="w-full px-4 py-3 border border-slate-200 rounded-xl"
                                                    value={product.category}
                                                    onChange={(e) =>
                                                        updateProduct(product.id, { category: e.target.value })
                                                    }
                                                >
                                                    <option value="">Select item category</option>
                                                    {productCategories.map((c) => (
                                                        <option key={c} value={c}>
                                                            {c}
                                                        </option>
                                                    ))}
                                                </select>
                                                {errors[`product_category_${index}`] && (
                                                    <p className="text-xs text-red-600">
                                                        {errors[`product_category_${index}`]}
                                                    </p>
                                                )}
                                            </div>

                                            <div className="lg:col-span-3">
                                                <div className="flex items-center gap-3">
                                                    <label className="px-4 py-2 rounded-xl bg-slate-100 font-bold cursor-pointer inline-flex items-center gap-2">
                                                        <Upload size={16} />
                                                        Upload images
                                                        <input
                                                            type="file"
                                                            className="hidden"
                                                            multiple
                                                            accept="image/*"
                                                            onChange={(e) => handleProductImageUpload(product.id, e)}
                                                        />
                                                    </label>
                                                    <span className="text-xs text-slate-500">
                                                        Max 4 images per item
                                                    </span>
                                                </div>
                                                {errors[`product_images_${index}`] && (
                                                    <p className="text-xs text-red-600 mt-2">
                                                        {errors[`product_images_${index}`]}
                                                    </p>
                                                )}

                                                {product.imagePreviews.length > 0 && (
                                                    <div className="mt-3 flex flex-wrap gap-3">
                                                        {product.imagePreviews.map((src, imgIndex) => (
                                                            <div key={src} className="relative">
                                                                <img
                                                                    src={src}
                                                                    alt={`Product item ${index + 1} preview ${imgIndex + 1}`}
                                                                    className="w-20 h-20 object-cover rounded-xl border"
                                                                />
                                                                <button
                                                                    aria-label={`Delete image ${imgIndex + 1} for item ${index + 1}`}
                                                                    type="button"
                                                                    onClick={() =>
                                                                        removeProductImage(product.id, imgIndex)
                                                                    }
                                                                    className="absolute -top-2 -right-2 bg-white border rounded-full p-1"
                                                                >
                                                                    <X size={14} />
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="mt-8 flex justify-end">
                            <button
                                type="button"
                                onClick={handleStep1Submit}
                                disabled={isSubmitting}
                                className="px-8 py-3 bg-[#f97316] text-white rounded-xl font-black shadow-lg hover:bg-[#ea580c] transition-all flex items-center gap-2 disabled:opacity-50"
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="animate-spin" size={18} />
                                        Processing...
                                    </>
                                ) : (
                                    "Continue"
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Step 2: Quotation / confirmation
          - Displays the estimated fee returned from Step 1
          - Allows the user to go back and edit details
          - Final confirmation calls confirm-order API
      */}
            {currentStep === 2 && pricingBreakdown && (
                <div className="space-y-6">
                    <div className="bg-white rounded-[24px] border border-slate-200 shadow-sm p-6">
                        <h2 className="text-2xl font-black text-slate-900 mb-6 flex items-center gap-2">
                            <DollarSign size={24} className="text-[#f97316]" />
                            Confirm price
                        </h2>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                                <p className="text-xs text-slate-500 font-bold">Estimated fee</p>
                                <p className="text-2xl font-black text-slate-900">
                                    {pricingBreakdown.estimated_fee.toLocaleString("en-US")} VND
                                </p>
                            </div>
                            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                                <p className="text-xs text-slate-500 font-bold">Total weight</p>
                                <p className="text-2xl font-black text-slate-900">
                                    {(pricingBreakdown.chargeable_weight ?? totalWeightG / 1000).toFixed(2)} kg
                                </p>
                            </div>
                        </div>

                        <div className="mt-8 flex gap-4 justify-end">
                            <button
                                type="button"
                                onClick={goBackToPreviousStep}
                                className="px-6 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-all"
                            >
                                Back
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmOrder}
                                disabled={isSubmitting}
                                className="px-8 py-3 bg-[#f97316] text-white rounded-xl font-black shadow-lg hover:bg-[#ea580c] transition-all flex items-center gap-2 disabled:opacity-50"
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="animate-spin" size={18} />
                                        Processing...
                                    </>
                                ) : (
                                    "Confirm"
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
