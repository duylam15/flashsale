import Image from 'next/image';
import OrderSection from '@/components/OrderSection';

interface Product {
  id: number;
  name: string;
  description: string;
  basePrice: number;
  imageUrl: string;
  inventory: {
    totalStock: number;
    soldStock: number;
    reservedStock?: number; // Bổ sung trường giữ chỗ đơn hàng PENDING
  };
}

async function getProduct(id: string): Promise<Product | null> {
  try {
    const res = await fetch('http://localhost:4000/v1/products', {
      cache: 'no-store',
    });

    if (!res.ok) {
      console.error('API Error:', res.status);
      return null;
    }

    const json = await res.json();
    const products: Product[] = json.data?.products || [];

    const found = products.find((p) => String(p.id) === String(id));
    return found || null;
  } catch (err) {
    console.error('Fetch detail error:', err);
    return null;
  }
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }> | { id: string };
}) {
  const resolvedParams = await params;
  const product = await getProduct(resolvedParams.id);

  if (!product) {
    return (
      <div className="max-w-xl mx-auto my-20 p-6 bg-red-50 border border-red-200 rounded-xl text-center">
        <h2 className="text-xl font-bold text-red-600 mb-2">Không tìm thấy sản phẩm!</h2>
        <p className="text-gray-600 text-sm">
          Đang tìm ID: <code className="font-mono bg-red-100 px-1 py-0.5 rounded">{resolvedParams.id}</code>
        </p>
        <p className="text-xs text-gray-400 mt-2">
          Vui lòng kiểm tra lại server backend ở port 4000 xem có trả về ID này không.
        </p>
      </div>
    );
  }

  const { inventory } = product;
  const total = inventory?.totalStock || 0;
  const sold = inventory?.soldStock || 0;
  const reserved = inventory?.reservedStock || 0;

  // Tính đúng số lượng hàng thực tế còn có thể mua (trừ cả hàng đang giữ chỗ)
  const remaining = Math.max(0, total - sold - reserved);
  const totalOccupied = sold + reserved;
  const soldPercent = total > 0 ? Math.min(Math.round((totalOccupied / total) * 100), 100) : 0;

  return (
    <div className="max-w-5xl mx-auto py-10 px-4">
      <div className="flex flex-col md:flex-row gap-10 bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
        {/* Ảnh */}
        <div className="flex-1">
          <div className="relative bg-gray-100 aspect-square rounded-2xl flex items-center justify-center overflow-hidden">
            <div className="relative w-full h-full bg-gray-100 overflow-hidden">
              <Image
                src={product.imageUrl}
                alt={product.name}
                fill
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 380px"
                quality={70}
                className="object-cover group-hover:scale-105 transition-transform duration-300"
                loading="lazy"
              />
            </div>
          </div>
        </div>

        {/* Thông tin & Form Đặt hàng */}
        <div className="flex-1 space-y-6 flex flex-col justify-center">
          <div>
            <span className="text-xs font-semibold text-gray-400 uppercase">Mã SP: #{product.id}</span>
            <h1 className="text-3xl font-bold text-gray-900 leading-tight mt-1">{product.name}</h1>
            <p className="text-gray-500 mt-2 text-sm">{product.description}</p>
          </div>

          <div className="bg-red-50 p-6 rounded-xl border border-red-100">
            <span className="text-4xl font-extrabold text-red-600">
              {product.basePrice.toLocaleString('vi-VN')}đ
            </span>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="font-medium text-gray-600">Tình trạng kho:</span>
              <span className="text-red-600 font-bold">
                {remaining > 0
                  ? `Chỉ còn ${remaining.toLocaleString('vi-VN')} sản phẩm`
                  : 'Hết hàng'}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <div
                className="bg-red-500 h-full rounded-full transition-all"
                style={{ width: `${soldPercent}%` }}
              />
            </div>
          </div>

          {/* Component đặt hàng */}
          <OrderSection productId={product.id} remaining={remaining} />
        </div>
      </div>
    </div>
  );
}