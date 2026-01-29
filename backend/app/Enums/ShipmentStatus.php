<?php

namespace App\Enums;

/**
 * Shipment status flow enum.
 * NOTE: keep values in sync with DB and frontend.
 */
enum ShipmentStatus: string
{
    case BOOKED = 'BOOKED';
    case PRICE_ESTIMATED = 'PRICE_ESTIMATED';
    case BRANCH_ASSIGNED = 'BRANCH_ASSIGNED';

    // Pickup scheduling
    case PICKUP_SCHEDULED = 'PICKUP_SCHEDULED';
    case PICKUP_RESCHEDULED = 'PICKUP_RESCHEDULED';

    // Pickup
    case ON_THE_WAY_PICKUP = 'ON_THE_WAY_PICKUP';
    case VERIFIED_ITEM = 'VERIFIED_ITEM';
    case ADJUST_ITEM = 'ADJUST_ITEM';
    case CONFIRMED_PRICE = 'CONFIRMED_PRICE';
    case ADJUSTED_PRICE = 'ADJUSTED_PRICE';
    case PENDING_PAYMENT = 'PENDING_PAYMENT';
    case CONFIRM_PAYMENT = 'CONFIRM_PAYMENT';
    case PAYMENT_CONFIRMED = 'PAYMENT_CONFIRMED';
    case PICKUP_COMPLETE = 'PICKUP_COMPLETE';
    case PICKUP_COMPLETED = 'PICKUP_COMPLETED';

    // Warehouses / transit
    case IN_ORIGIN_WAREHOUSE = 'IN_ORIGIN_WAREHOUSE';
    case IN_TRANSIT = 'IN_TRANSIT';
    case IN_DEST_WAREHOUSE = 'IN_DEST_WAREHOUSE';

    // Delivery
    case OUT_FOR_DELIVERY = 'OUT_FOR_DELIVERY';
    case DELIVERY_FAILED = 'DELIVERY_FAILED';
    case DELIVERED_SUCCESS = 'DELIVERED_SUCCESS';

    // Returns / close
    case RETURN_CREATED = 'RETURN_CREATED';
    case RETURN_IN_TRANSIT = 'RETURN_IN_TRANSIT';
    case RETURNED_TO_ORIGIN = 'RETURNED_TO_ORIGIN';
    case RETURN_COMPLETED = 'RETURN_COMPLETED';
    case DISPOSED = 'DISPOSED';
    case CLOSED = 'CLOSED';

    // Exception
    case ISSUE = 'ISSUE';
}
