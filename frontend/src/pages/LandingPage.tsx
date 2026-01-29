
import React from 'react';
import { 
  Truck, 
  Search, 
  ArrowRight, 
  CheckCircle2,
  Bike,
  Zap,
  Box,
  Globe,
  MapPin,
  Clock,
  Layers,
  ShoppingBag,
  Coffee,
  Monitor,
  Gem,
  Home,
  HardHat,
  Package,
  ShieldCheck,
  TrendingUp,
  ChevronRight,
  Phone,
  CheckCircle
} from 'lucide-react';

interface Props {
  onStart: () => void;
  onSignUp: () => void;
  onTrack: () => void;
}

const LandingPage: React.FC<Props> = ({ onStart, onSignUp, onTrack }) => {
  return (
    <div className="min-h-screen bg-white font-sans text-slate-900">
      {/* Header */}
      <nav className="sticky top-0 w-full z-[100] bg-white/95 backdrop-blur-xl border-b border-slate-100 h-20 flex items-center justify-between px-6 lg:px-20 shadow-sm transition-all duration-300">
        <div className="flex items-center space-x-3 group cursor-pointer">
          <div className="w-10 h-10 bg-[#f97316] rounded-xl shadow-lg flex items-center justify-center text-white transform group-hover:rotate-12 transition-transform">
            <PackageIcon size={24} />
          </div>
          <span className="text-2xl font-black text-slate-900 tracking-tighter">
            Courier<span className="text-[#f97316]">Xpress</span>
          </span>
        </div>
        
        <div className="flex items-center gap-4">
          <button 
            onClick={onStart} 
            className="text-slate-600 px-5 py-2.5 rounded-xl text-sm font-black uppercase tracking-widest hover:text-[#f97316] transition-all"
          >
            Login
          </button>
          <button 
            onClick={onSignUp} 
            className="bg-[#f97316] text-white px-8 py-3 rounded-xl text-sm font-black uppercase tracking-widest hover:bg-[#ea580c] transition-all shadow-lg shadow-orange-200 active:scale-95"
          >
            Sign Up
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-[calc(100vh-80px)] flex flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-[#f97316] via-[#f97316] to-[#ea580c]">
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <path d="M0,50 Q25,30 50,50 T100,50" fill="none" stroke="white" strokeWidth="0.5" />
            <path d="M0,70 Q25,50 50,70 T100,70" fill="none" stroke="white" strokeWidth="0.5" />
            <circle cx="20" cy="20" r="10" fill="white" opacity="0.2" />
            <circle cx="80" cy="80" r="15" fill="white" opacity="0.1" />
          </svg>
        </div>

        {/* Floating Assets */}
        <div className="absolute left-[-2%] bottom-[15%] w-[35%] lg:w-[28%] animate-float-slow hidden md:block z-10">
           <div className="relative group">
             <img 
               src="https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&q=80&w=800" 
               className="rounded-[40px] shadow-2xl border-4 border-white/20 rotate-6 transition-transform duration-500 group-hover:rotate-3" 
               alt="Cargo" 
             />
             <div className="absolute inset-0 bg-orange-600/20 rounded-[40px] mix-blend-overlay"></div>
           </div>
        </div>

        <div className="absolute right-[-2%] top-[15%] w-[40%] lg:w-[32%] animate-float hidden md:block z-10">
           <div className="relative group">
             <img 
               src="https://images.unsplash.com/photo-1494412519320-aa613dfb7738?auto=format&fit=crop&q=80&w=800" 
               className="rounded-[60px] shadow-2xl border-4 border-white/20 -rotate-3 transition-transform duration-500 group-hover:rotate-0" 
               alt="Cargo Ship" 
             />
           </div>
        </div>

        <div className="relative z-20 px-6 max-w-4xl mx-auto text-center pt-24 lg:pt-36 pb-12 lg:pb-20">
          <div className="space-y-8 flex flex-col items-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-md rounded-full border border-white/20 text-white text-[10px] font-black uppercase tracking-[0.2em] animate-fade-in">
               <Zap size={14} className="text-white fill-white" /> Scaling Excellence Together
            </div>
            <h1 className="text-6xl lg:text-7xl font-black text-white leading-[0.95] tracking-tighter drop-shadow-2xl">
              More Than <br />
              Just Logistics
            </h1>
            <p className="text-lg lg:text-xl text-white/95 font-medium leading-relaxed max-w-2xl mx-auto drop-shadow-lg">
              We specialize in providing sophisticated multi-modal shipping solutions. 
              Every shipment, no matter how unique, is handled with professional precision by CourierXpress.
            </p>
            <div className="flex flex-col sm:flex-row gap-5 justify-center items-center pt-1">
              <button 
                onClick={onStart}
                className="w-full sm:w-auto bg-white text-[#f97316] px-10 py-4 lg:px-12 lg:py-5 rounded-2xl font-black uppercase tracking-widest hover:bg-slate-900 hover:text-white transition-all shadow-2xl active:scale-95 group"
              >
                Login Now
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* REFINED DOMESTIC SERVICES */}
      <section className="py-24 bg-slate-50 px-6 lg:px-20 relative">
        <div className="max-w-7xl mx-auto bg-white rounded-[60px] shadow-3xl border border-slate-100 p-10 lg:p-20 relative overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-20 items-center">
            
            {/* Left Content Column */}
            <div className="flex flex-col items-center lg:items-start text-center lg:text-left space-y-12 relative">
              {/* Vertical Badge */}
              <div className="absolute -left-10 top-2 bottom-0 hidden lg:flex flex-col items-center gap-12 w-1">
                 <div className="h-16 w-1.5 bg-[#f97316] rounded-full"></div>
                 <p className="vertical-text text-[10px] font-black text-slate-400 uppercase tracking-[0.6em] whitespace-nowrap">Why Choose Us?</p>
              </div>

              <div className="space-y-6">
                <h2 className="text-4xl lg:text-6xl font-black text-slate-900 leading-[1.1] tracking-tighter">
                  Your Trusted Partner <br />
                  in Global Shipping
                </h2>
                <p className="text-slate-500 font-medium text-lg leading-relaxed max-w-lg mx-auto lg:mx-0">
                  We provide personalized multi-modal shipping solutions for all post offices and warehouses nationwide.
                </p>
              </div>

              {/* Checkbox List */}
              <div className="flex flex-col items-center lg:items-start space-y-5">
                {[
                  "Competitive Rates",
                  "Seamless Logistics",
                  "Flexible Solutions"
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center gap-4 group">
                    <div className="w-8 h-8 bg-slate-900 text-white rounded-full flex items-center justify-center transition-transform group-hover:scale-110">
                      <CheckCircle size={18} className="fill-white text-slate-900" strokeWidth={2.5} />
                    </div>
                    <span className="font-black text-slate-900 text-xl tracking-tight">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Image Content */}
            <div className="relative mx-auto lg:mx-0 w-full max-w-md lg:max-w-none">
              <div className="rounded-[40px] overflow-hidden shadow-2xl border-4 border-slate-50">
                <img 
                  src="https://images.unsplash.com/photo-1578575437130-527eed3abbec?auto=format&fit=crop&q=80&w=1200" 
                  className="w-full h-full object-cover aspect-[4/5]" 
                  alt="Shipping Container" 
                />
              </div>
              <div className="absolute -top-12 -right-12 w-48 h-48 bg-[#f97316]/10 rounded-full blur-3xl -z-10"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Item Categories */}
      <section className="py-24 bg-white px-6 lg:px-20">
        <div className="max-w-7xl mx-auto text-center space-y-4 mb-16">
          <span className="text-[#f97316] text-xs font-black uppercase tracking-[0.2em]">Our Capability</span>
          <h2 className="text-4xl font-black text-slate-900 tracking-tighter">Cargo We Handle</h2>
        </div>
        <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            { title: 'Luxury Fashion', icon: ShoppingBag },
            { title: 'Food & Beverages', icon: Coffee },
            { title: 'Office Supplies & Gear', icon: Layers },
            { title: 'Tech Electronics', icon: Monitor },
            { title: 'Fragile High-Value', icon: Gem },
            { title: 'Furniture & Decor', icon: Home },
            { title: 'Construction Materials', icon: HardHat },
            { title: 'Vehicles', icon: Bike },
            { title: 'Moving & Personal Effects', icon: Package },
          ].map((item, i) => (
            <div key={i} className="bg-white p-10 rounded-[40px] border border-slate-200 flex items-center gap-6 hover:shadow-2xl transition-all group hover:border-[#f97316]/30">
              <div className="w-16 h-16 bg-orange-50 text-[#f97316] rounded-2xl flex items-center justify-center shrink-0 group-hover:bg-[#f97316] group-hover:text-white transition-all duration-500 shadow-sm">
                <item.icon size={32} />
              </div>
              <span className="font-black text-slate-700 text-lg tracking-tight">{item.title}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Fleet Section */}
      <section className="py-32 bg-white px-6 lg:px-20 overflow-hidden">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-24">
          <div className="lg:w-1/2 space-y-12 text-center lg:text-left flex flex-col items-center lg:items-start">
            <div className="space-y-6">
              <span className="text-[#f97316] text-xs font-black uppercase tracking-[0.3em]">Transport System</span>
              <h2 className="text-5xl lg:text-7xl font-black text-slate-900 tracking-tighter leading-[0.9]">Current Fleet at Local Branches</h2>
              <p className="text-slate-500 font-medium leading-relaxed text-xl max-w-xl">
                We own a diverse fleet of vehicles, maintained regularly to ensure your goods are always transported in the best conditions.
              </p>
            </div>
            <div className="grid gap-4 w-full">
              {[
                { label: 'Specialized Motorbikes', info: 'Agile for crowded urban centers', icon: Bike },
                { label: '2 Ton Trucks', info: 'Efficient medium-range transport', icon: Truck },
                { label: '3.5 Ton Trucks', info: 'Standard bulk logistics capability', icon: Truck },
                { label: '5 Ton Trucks', info: 'Heavy inter-provincial freight', icon: Truck },
              ].map((vehicle, i) => (
                <div key={i} className="flex items-center gap-6 p-6 bg-slate-50 rounded-[32px] border border-slate-100 hover:border-orange-200 transition-all group hover:bg-white hover:shadow-xl">
                  <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-[#f97316] shadow-sm group-hover:bg-[#f97316] group-hover:text-white transition-all">
                    <vehicle.icon size={26} />
                  </div>
                  <div className="text-left">
                    <span className="font-black text-slate-900 text-lg block">{vehicle.label}</span>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{vehicle.info}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="lg:w-1/2 relative w-full max-w-lg mx-auto lg:mx-0">
            <div className="bg-slate-900 rounded-[100px] aspect-[4/5] flex items-center justify-center overflow-hidden relative shadow-3xl">
               <img src="https://images.unsplash.com/photo-1612630741022-b29ec17d013d?q=80&w=687&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" alt="Professional Courier Staff" />
               <div className="absolute inset-0 bg-gradient-to-tr from-[#f97316]/40 to-transparent"></div>
               <div className="absolute bottom-16 left-12 right-12 bg-white/10 backdrop-blur-2xl border border-white/20 p-10 rounded-[50px] text-white">
                  <div className="flex items-center gap-5 mb-6">
                    <div className="w-16 h-16 bg-[#f97316] rounded-3xl flex items-center justify-center shadow-2xl"><ShieldCheck size={32} /></div>
                    <h5 className="font-black text-2xl">100% Insurance</h5>
                  </div>
                  <p className="text-base font-medium opacity-90 leading-relaxed">CourierXpress takes full responsibility for the safety of your items throughout the journey.</p>
               </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 pt-32 pb-16 px-6 lg:px-20 text-white relative">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-20 mb-24">
          <div className="space-y-8">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-[#f97316] rounded-2xl flex items-center justify-center text-white shadow-2xl">
                <PackageIcon size={26} />
              </div>
              <span className="text-3xl font-black tracking-tighter">CourierXpress</span>
            </div>
            <p className="text-slate-400 text-base leading-relaxed font-medium">Shaping the future of Logistics through technology and dedication.</p>
          </div>
          <div>
            <h4 className="text-xl font-black mb-10 relative inline-block">Solutions<div className="absolute -bottom-3 left-0 w-16 h-1.5 bg-[#f97316] rounded-full"></div></h4>
            <ul className="space-y-5 text-slate-400 text-sm font-bold">
              <li className="hover:text-[#f97316] cursor-pointer transition-colors">Track Shipment</li>
              <li className="hover:text-[#f97316] cursor-pointer transition-colors">Quick Pricing</li>
              <li className="hover:text-[#f97316] cursor-pointer transition-colors">Branch Locator</li>
            </ul>
          </div>
          <div>
            <h4 className="text-xl font-black mb-10 relative inline-block">Company<div className="absolute -bottom-3 left-0 w-16 h-1.5 bg-[#f97316] rounded-full"></div></h4>
            <ul className="space-y-5 text-slate-400 text-sm font-bold">
              <li className="hover:text-[#f97316] cursor-pointer transition-colors">About Us</li>
              <li className="hover:text-[#f97316] cursor-pointer transition-colors">Contact</li>
              <li className="hover:text-[#f97316] cursor-pointer transition-colors">Careers</li>
            </ul>
          </div>
          <div className="space-y-10">
            <h4 className="text-xl font-black relative inline-block">Newsletter<div className="absolute -bottom-3 left-0 w-16 h-1.5 bg-[#f97316] rounded-full"></div></h4>
            <div className="relative">
              <input type="email" placeholder="Your email address" className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-5 outline-none focus:border-[#f97316] transition-all text-sm font-medium" />
              <button className="absolute right-2 top-2 bottom-2 bg-[#f97316] px-5 rounded-xl shadow-2xl hover:bg-[#ea580c] transition-all transform active:scale-95"><ArrowRight size={20} /></button>
            </div>
          </div>
        </div>
        <div className="pt-12 border-t border-white/5 text-[10px] font-black uppercase tracking-[0.3em] text-slate-600 text-center">
          <p>© 2024 CourierXpress Logistics Management System. All Rights Reserved.</p>
        </div>
      </footer>
      
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0) rotate(-3deg); }
          50% { transform: translateY(-25px) rotate(-1deg); }
        }
        @keyframes float-slow {
          0%, 100% { transform: translateY(0) rotate(6deg); }
          50% { transform: translateY(-20px) rotate(8deg); }
        }
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-float { animation: float 7s ease-in-out infinite; }
        .animate-float-slow { animation: float-slow 10s ease-in-out infinite; }
        .animate-fade-in { animation: fade-in 1s ease-out forwards; }
        .shadow-3xl { box-shadow: 0 35px 60px -15px rgba(0, 0, 0, 0.1); }
        .vertical-text { writing-mode: vertical-rl; transform: rotate(180deg); }
      `}</style>
    </div>
  );
};

const PackageIcon = ({ size, className }: { size: number, className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
    <path d="m3.3 7 8.7 5 8.7-5" /><path d="M12 22V12" />
  </svg>
);

export default LandingPage;
