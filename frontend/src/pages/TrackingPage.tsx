
import React, { useState } from 'react';
import { Search, MapPin, Package, Truck, CheckCircle, Clock, ArrowRight, Loader2, XCircle } from 'lucide-react';
import { CourierService } from '../services/api';

const TrackingPage: React.FC = () => {
  const [trackingId, setTrackingId] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [result, setResult] = useState<any | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackingId.trim()) return;
    
    setIsSearching(true);
    setResult(null);

    try {
      const response = await CourierService.track(trackingId.trim());
      
      if (response.data.success) {
        const courier = response.data.data;
        
        // Format result for display
        const formattedResult = {
          id: courier.trackingId,
          status: courier.status,
          origin: courier.sender.address,
          destination: courier.receiver.address,
          bookedOn: new Date(courier.bookingDate).toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
          }),
          estDelivery: courier.eta ? new Date(courier.eta).toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
          }) : 'TBD',
          history: [
            { 
              time: new Date(courier.bookingDate).toLocaleString('en-US', { 
                month: 'short', 
                day: 'numeric', 
                hour: 'numeric', 
                minute: '2-digit' 
              }), 
              location: 'Online', 
              desc: 'Shipment info received - Label Generated' 
            },
            // Add more history based on status
            ...(courier.status !== 'BOOKED' ? [{
              time: new Date(courier.bookingDate).toLocaleString('en-US', { 
                month: 'short', 
                day: 'numeric', 
                hour: 'numeric', 
                minute: '2-digit' 
              }),
              location: courier.sender.address.split(',')[0] || 'Pickup Location',
              desc: 'Picked up by courier agent'
            }] : []),
            ...(courier.status === 'IN_TRANSIT' || courier.status === 'OUT_FOR_DELIVERY' || courier.status === 'DELIVERED' ? [{
              time: new Date().toLocaleString('en-US', { 
                month: 'short', 
                day: 'numeric', 
                hour: 'numeric', 
                minute: '2-digit' 
              }),
              location: 'In Transit',
              desc: 'Package is on the way to destination'
            }] : []),
            ...(courier.status === 'DELIVERED' ? [{
              time: courier.eta ? new Date(courier.eta).toLocaleString('en-US', { 
                month: 'short', 
                day: 'numeric', 
                hour: 'numeric', 
                minute: '2-digit' 
              }) : new Date().toLocaleString('en-US', { 
                month: 'short', 
                day: 'numeric', 
                hour: 'numeric', 
                minute: '2-digit' 
              }),
              location: courier.receiver.address.split(',')[0] || 'Delivery Location',
              desc: 'Package delivered successfully'
            }] : [])
          ],
          courier: courier
        };
        
        setResult(formattedResult);
      }
    } catch (error: any) {
      console.error('Tracking error:', error);
      setResult({
        error: true,
        message: error.response?.data?.message || 'Tracking ID not found. Please check and try again.'
      });
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-12 space-y-12">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-black text-slate-900 tracking-tight">Real-Time Tracking</h1>
        <p className="text-slate-500 max-w-lg mx-auto font-medium">
          Enter your unique tracking number below to see exactly where your parcel is and when it will arrive.
        </p>
      </div>

      <div className="bg-white p-8 rounded-[40px] shadow-2xl border border-slate-100">
        <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-orange-400" size={24} />
            <input 
              type="text" 
              placeholder="e.g. CX-88921-USA" 
              className="w-full pl-14 pr-6 py-5 bg-orange-50/30 border-2 border-orange-100 rounded-3xl text-lg font-bold text-slate-900 focus:border-orange-500 focus:bg-white transition-all outline-none placeholder:text-orange-200"
              value={trackingId}
              onChange={(e) => setTrackingId(e.target.value)}
            />
          </div>
          <button 
            type="submit" 
            disabled={isSearching || !trackingId.trim()}
            className="bg-orange-600 text-white px-10 py-5 rounded-3xl font-black text-lg shadow-xl hover:bg-orange-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSearching ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                Locating...
              </>
            ) : (
              'Find My Parcel'
            )}
          </button>
        </form>

        {result && result.error && (
          <div className="mt-12 p-8 bg-rose-50 border-2 border-rose-200 rounded-3xl text-center space-y-4">
            <XCircle size={48} className="text-rose-500 mx-auto" />
            <p className="text-lg font-bold text-rose-700">{result.message}</p>
          </div>
        )}

        {result && !result.error && (
          <div className="mt-12 space-y-10 animate-in slide-in-from-bottom-4 duration-500">
            {/* Status Header */}
            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Status</p>
                <div className="flex items-center text-orange-600 font-black text-xl">
                  <Truck className="mr-2" size={24} /> {result.status}
                </div>
              </div>
              <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Current Location</p>
                <div className="flex items-center text-slate-900 font-black text-lg">
                  <MapPin className="mr-2 text-rose-500" size={20} /> Frankfurt, DE
                </div>
              </div>
              <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Est. Arrival</p>
                <div className="flex items-center text-emerald-600 font-black text-lg">
                  <Clock className="mr-2" size={20} /> {result.estDelivery}
                </div>
              </div>
            </div>

            {/* Visual Timeline */}
            <div className="px-4">
              <h3 className="text-xl font-black text-slate-900 mb-8">Shipment Progress</h3>
              <div className="relative space-y-12">
                <div className="absolute left-[27px] top-2 bottom-2 w-1 bg-gradient-to-b from-orange-500 via-orange-200 to-slate-100 rounded-full"></div>
                {result.history.map((step: any, i: number) => (
                  <div key={i} className="relative flex items-start gap-8 group">
                    <div className={`z-10 w-14 h-14 rounded-full flex items-center justify-center border-4 border-white shadow-lg transition-transform group-hover:scale-110 ${i === 0 ? 'bg-orange-600 text-white animate-pulse' : 'bg-white text-slate-300'}`}>
                      {i === 0 ? <Truck size={24} /> : i === result.history.length - 1 ? <Package size={24} /> : <CheckCircle size={24} />}
                    </div>
                    <div className="flex-1 pt-2">
                      <div className="flex items-center justify-between mb-1">
                        <p className={`font-black text-lg ${i === 0 ? 'text-orange-600' : 'text-slate-900'}`}>{step.location}</p>
                        <span className="text-sm font-bold text-slate-400">{step.time}</span>
                      </div>
                      <p className="text-slate-500 font-medium">{step.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-8 border-t border-slate-100 flex justify-between items-center">
              <div className="flex items-center gap-4">
                <img src="https://picsum.photos/seed/truck/100/100" className="w-16 h-16 rounded-2xl" />
                <div>
                  <p className="font-bold text-slate-900">Courier Partner</p>
                  <p className="text-sm text-slate-500">CX Global Express (Air)</p>
                </div>
              </div>
              <button className="px-6 py-3 border-2 border-slate-200 rounded-2xl font-black text-slate-600 hover:bg-slate-50 transition-colors">
                Print Details
              </button>
            </div>
          </div>
        )}

        {!result && !isSearching && (
          <div className="mt-16 text-center space-y-6">
            <div className="w-24 h-24 bg-orange-50 rounded-full flex items-center justify-center text-orange-200 mx-auto">
              <Package size={48} />
            </div>
            <p className="text-slate-400 font-medium italic">Track multiple parcels by entering IDs separated by commas</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TrackingPage;
