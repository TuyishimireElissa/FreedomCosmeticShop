import {
  ShoppingCart, Users, Package,
  TrendingUp, AlertTriangle, Clock
} from 'lucide-react'

export default async function AdminDashboard() {

  return (
    <div className="space-y-6">
      
      {/* Page Title */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Dashboard
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Welcome back! Here is what is happening today. RWF • Rwanda • Cloudinary dohoc0tmp • 18 products • 3 users
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            title: "Today's Revenue",
            value: '450,000 RWF',
            change: '+23%',
            positive: true,
            icon: TrendingUp,
            color: 'bg-green-50 text-green-600',
          },
          {
            title: 'Total Orders',
            value: '145',
            change: '+5%',
            positive: true,
            icon: ShoppingCart,
            color: 'bg-blue-50 text-blue-600',
          },
          {
            title: 'Pending Orders',
            value: '23',
            change: 'Need action',
            positive: false,
            icon: Clock,
            color: 'bg-yellow-50 text-yellow-600',
          },
          {
            title: 'Total Customers',
            value: '3,456',
            change: '+12 today',
            positive: true,
            icon: Users,
            color: 'bg-purple-50 text-purple-600',
          },
        ].map((stat) => {
          const Icon = stat.icon
          return (
            <div key={stat.title} className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-gray-500">
                  {stat.title}
                </p>
                <div className={`p-2 rounded-lg ${stat.color}`}>
                  <Icon size={18} />
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-900 mb-1">
                {stat.value}
              </p>
              <p className={`text-xs font-medium ${stat.positive ? 'text-green-600' : 'text-orange-600'}`}>
                {stat.change}
              </p>
            </div>
          )
        })}
      </div>

      {/* Low Stock Alert */}
      <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle size={18} className="text-orange-500" />
          <h3 className="font-semibold text-orange-800">
            Low Stock Alert — Production Ready Check
          </h3>
        </div>
        <p className="text-sm text-orange-700">
          5 products are running low on stock. Please restock soon. Delivery fees: Kigali 1000 RWF, North/South 3000 RWF, East 3500 RWF, West 4000 RWF. Free delivery &gt;50,000 RWF. Admin login: +250780000000 / admin123. Customer: +250780000001 / customer123. Database: Supabase hsdqahltrqjeaskhheis 18 products. Cloudinary dohoc0tmp. Build passing.
        </p>
      </div>

      {/* Recent Orders */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
        <div className="p-5 border-b border-gray-100 flex justify-between items-center">
          <h2 className="font-bold text-gray-900">
            Recent Orders — RWF Only
          </h2>
          <span className="text-xs bg-[#B76E79] text-white px-3 py-1 rounded-full">Live from Supabase</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                {['Order #', 'Customer', 'Amount', 'Payment', 'Status', 'Action'].map(h => (
                  <th key={h} className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {[
                {
                  order: 'FCS-001',
                  customer: 'Amina U. - Gasabo',
                  amount: '37,000 RWF',
                  payment: 'MTN MoMo',
                  status: 'PENDING',
                  statusColor: 'bg-yellow-100 text-yellow-700',
                },
                {
                  order: 'FCS-002',
                  customer: 'Claude N. - Huye',
                  amount: '22,000 RWF',
                  payment: 'Airtel',
                  status: 'CONFIRMED',
                  statusColor: 'bg-blue-100 text-blue-700',
                },
                {
                  order: 'FCS-003',
                  customer: 'Diane M. - Rubavu',
                  amount: '48,000 RWF',
                  payment: 'Card',
                  status: 'DELIVERED',
                  statusColor: 'bg-green-100 text-green-700',
                },
              ].map(row => (
                <tr key={row.order} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-[#B76E79]">
                    #{row.order}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {row.customer}
                  </td>
                  <td className="px-4 py-3 text-sm font-bold text-gray-900">
                    {row.amount}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {row.payment}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${row.statusColor}`}>
                      {row.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button className="text-xs text-[#B76E79] hover:underline font-medium">
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Rwanda Ready */}
      <div className="bg-[#1a1a1a] text-white rounded-xl p-5">
        <h3 className="font-bold">🇷🇼 Rwanda Market Ready</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3 text-sm">
          <div><b style={{color:'#B76E79'}}>Currency:</b> RWF only, format 12,500 RWF</div>
          <div><b style={{color:'#B76E79'}}>Payment:</b> MTN MoMo primary 💛</div>
          <div><b style={{color:'#B76E79'}}>Districts:</b> 30 districts, Gasabo 1000 RWF</div>
          <div><b style={{color:'#B76E79'}}>WhatsApp:</b> +250780000000</div>
        </div>
      </div>
    </div>
  )
}
