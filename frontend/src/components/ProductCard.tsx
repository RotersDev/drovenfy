import { motion } from "framer-motion";
import { Product } from "@/types";
import { formatCurrency } from "@/lib/utils";

interface ProductCardProps {
  product: Product;
  onClick: () => void;
}

export default function ProductCard({ product, onClick }: ProductCardProps) {
  return (
    <motion.div
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="bg-white rounded-2xl p-4 border border-neutral-200 flex gap-4 cursor-pointer hover:border-orange-300 hover:shadow-sm transition-all group"
    >
      <div className="flex-1 flex flex-col justify-between">
        <div>
          <h3 className="font-bold text-neutral-900">{product.name}</h3>
          <p className="text-xs text-neutral-500 mt-1 line-clamp-2 leading-relaxed">
            {product.description}
          </p>
        </div>
        <div className="flex items-center justify-between mt-3">
          <p className="text-orange-500 font-bold">
            {formatCurrency(product.price)}
          </p>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClick();
            }}
            className="bg-orange-50 text-orange-500 text-[10px] font-bold px-3 py-1.5 rounded-lg hover:bg-orange-500 hover:text-white transition-all"
          >
            ADICIONAR
          </button>
        </div>
      </div>
      {product.image && (
        <div className="w-24 h-24 rounded-xl overflow-hidden flex-shrink-0 bg-neutral-50 border border-neutral-100">
          <img
            src={product.image}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          />
        </div>
      )}
    </motion.div>
  );
}
