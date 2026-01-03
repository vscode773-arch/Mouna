import React, { useState, useEffect } from 'react';
import { Search, Filter, Plus, Scan, ArrowRight, User, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { format, differenceInDays } from 'date-fns';
import { ar } from 'date-fns/locale';
import AddProduct from '../components/AddProduct';
import EditProductModal from '../components/EditProductModal';
import { API_URL } from '../config';
import { useLocation, useNavigate } from 'react-router-dom';

export default function Products() {
    const location = useLocation();
    const navigate = useNavigate();
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [initialAddData, setInitialAddData] = useState(null);

    // Pagination State
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);

    // New State for Edit/Delete
    const [editingProduct, setEditingProduct] = useState(null);

    const { user } = useAuth();

    // Reset list when search changes
    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            setPage(1);
            fetchProducts(1, true);
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm]);

    useEffect(() => {
        if (location.state?.openAddModal) {
            setInitialAddData(location.state.productData);
            setIsAddModalOpen(true);
            window.history.replaceState({}, document.title);
        }
    }, [location]);

    const fetchProducts = async (pageNum = 1, reset = false) => {
        try {
            if (pageNum === 1) setLoading(true);
            else setIsLoadingMore(true);

            const query = new URLSearchParams({
                page: pageNum,
                limit: 20, // Load 20 at a time for speed
                search: searchTerm
            });

            const response = await fetch(`${API_URL}/api/products?${query}`);
            if (response.ok) {
                const result = await response.json();
                const newProducts = result.data || [];

                if (reset) {
                    setProducts(newProducts);
                } else {
                    setProducts(prev => [...prev, ...newProducts]);
                }

                // Pagination check
                const totalLoaded = (pageNum - 1) * 20 + newProducts.length;
                setHasMore(totalLoaded < (result.pagination?.total || 0));
            }
        } catch (error) {
            console.error("Failed to fetch products", error);
        } finally {
            setLoading(false);
            setIsLoadingMore(false);
        }
    };

    const loadMore = () => {
        const nextPage = page + 1;
        setPage(nextPage);
        fetchProducts(nextPage, false);
    };

    const handleAddProduct = async (newProduct) => {
        try {
            const response = await fetch(`${API_URL}/api/products`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...newProduct, addedByUserId: user?.id || 1 })
            });

            if (response.ok) {
                setPage(1);
                fetchProducts(1, true);
            }
        } catch (error) {
            console.error("Failed to add product", error);
        }
    };

    // Handle Update
    const handleUpdateProduct = async (updatedProduct) => {
        try {
            const response = await fetch(`${API_URL}/api/products/${updatedProduct.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...updatedProduct, userId: user?.id || 1 })
            });

            if (response.ok) {
                // Update specific product in the list locally to avoid refetch
                setProducts(prev => prev.map(p => p.id === updatedProduct.id ? { ...p, ...updatedProduct } : p));
            }
        } catch (error) {
            console.error("Failed to update product", error);
        }
    };

    // Handle Delete
    const handleDeleteProduct = async (productId, reason, reasonDetails) => {
        try {
            const response = await fetch(`${API_URL}/api/products/${productId}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: user?.id || 1,
                    reason,
                    reasonDetails
                })
            });

            if (response.ok) {
                setProducts(prev => prev.filter(p => p.id !== productId));
            }
        } catch (error) {
            console.error("Failed to delete product", error);
        }
    };

    const getExpiryStatus = (expiryDate) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const expiry = new Date(expiryDate);
        expiry.setHours(0, 0, 0, 0);

        const diffDays = differenceInDays(expiry, today);

        if (diffDays < 0) return { label: 'منتهي الصلاحية', color: 'bg-red-500', status: 'expired' };
        if (diffDays === 0) return { label: 'ينتهي اليوم', color: 'bg-red-500', status: 'today' };
        if (diffDays <= 7) return { label: 'ينتهي قريباً', color: 'bg-orange-500', status: 'soon' };
        return { label: 'صالح', color: 'bg-emerald-500', status: 'valid' };
    };

    const ProductCard = ({ product }) => {
        const statusInfo = getExpiryStatus(product.expiry);
        const diffDays = differenceInDays(new Date(product.expiry), new Date());

        return (
            <motion.div
                layoutId={product.id}
                onClick={() => setEditingProduct(product)}
                className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700/50 flex items-center gap-4 group hover:shadow-md transition-all cursor-pointer relative overflow-hidden"
            >
                {/* Status Strip */}
                <div className={`absolute right-0 top-0 bottom-0 w-1.5 ${statusInfo.color}`} />

                {/* Image */}
                <div className="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-xl overflow-hidden shadow-sm flex-shrink-0 border border-slate-100 dark:border-slate-700">
                    {product.image ? (
                        <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-400">
                            <Scan className="w-8 h-8" />
                        </div>
                    )}
                </div>

                {/* Info Block */}
                <div className="flex-1 min-w-0 flex flex-col justify-center gap-1.5">
                    <h3 className="font-bold text-slate-900 dark:text-white text-base truncate">
                        {product.name}
                    </h3>

                    <div className="flex items-center gap-2 flex-wrap text-xs">
                        <span className="text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-700/50 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-600">
                            {product.category}
                        </span>
                        {product.department && (
                            <span className="text-slate-400 pl-2 border-l border-slate-200 dark:border-slate-700 ml-2">
                                {product.department}
                            </span>
                        )}
                    </div>

                    {/* Added By */}
                    {product.addedBy && (
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-0.5">
                            <div className="w-4 h-4 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                                <User className="w-2.5 h-2.5" />
                            </div>
                            <span>{product.addedBy.name}</span>
                        </div>
                    )}
                </div>

                {/* Date Block */}
                <div className="text-left flex-shrink-0 pl-2">
                    <p className={`text-sm font-bold ${statusInfo.color.replace('bg-', 'text-')}`}>
                        {format(new Date(product.expiry), 'dd/MM/yyyy')}
                    </p>
                    <p className={`text-xs font-medium mt-1 ${statusInfo.status === 'today' ? 'text-red-600 font-bold' : statusInfo.status === 'expired' ? 'text-red-400' : 'text-slate-400'}`}>
                        {statusInfo.status === 'today' ? 'ينتهي اليوم' : statusInfo.status === 'expired' ? `منذ ${Math.abs(diffDays)} يوم` : `${diffDays} يوم متبقي`}
                    </p>
                </div>
            </motion.div>
        );
    };

    return (
        <div className="pb-20 md:pb-0 space-y-6">
            {/* Header & Search */}
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                <div className="w-full md:w-auto">
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">المنتجات</h2>
                    <p className="text-slate-500 dark:text-slate-400">إدارة صلاحية المنتجات والمخزون</p>
                </div>

                {/* Search & Action Bar */}
                <div className="flex items-center gap-2 w-full md:w-auto bg-white dark:bg-slate-800 p-2 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700/50">

                    {/* Search Input */}
                    <div className="relative flex-1">
                        <input
                            type="text"
                            placeholder="بحث عن منتج..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-transparent border-none py-2.5 pr-9 pl-4 text-sm focus:ring-0 placeholder:text-slate-400 dark:text-white"
                        />
                        <Search className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>

                    {/* Add Button */}
                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="bg-emerald-500 hover:bg-emerald-600 text-white w-10 h-10 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20 transition-transform active:scale-95 flex-shrink-0"
                    >
                        <Plus className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                </div>
            ) : (
                <div className="space-y-4">
                    {/* Products List - Flat List instead of Groups for performance */}
                    <div className="flex flex-col gap-3">
                        {products.map(p => <ProductCard key={p.id} product={p} />)}
                    </div>

                    {/* Load More Button */}
                    {hasMore && products.length > 0 && (
                        <div className="flex justify-center pt-4">
                            <button
                                onClick={loadMore}
                                disabled={isLoadingMore}
                                className="px-6 py-2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-50 flex items-center gap-2"
                            >
                                {isLoadingMore && <Loader2 className="w-4 h-4 animate-spin" />}
                                <span>{isLoadingMore ? 'جاري التحميل...' : 'تحميل المزيد'}</span>
                            </button>
                        </div>
                    )}

                    {products.length === 0 && !loading && (
                        <div className="text-center py-20">
                            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
                                <Scan className="w-8 h-8" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">لا توجد منتجات</h3>
                            <p className="text-slate-500">جرب البحث عن شيء آخر أو أضف منتجاً جديداً</p>
                        </div>
                    )}
                </div>
            )}

            {/* Modals remain the same */}
            <AddProduct
                isOpen={isAddModalOpen}
                onClose={() => {
                    setIsAddModalOpen(false);
                    setInitialAddData(null);
                }}
                onAdd={handleAddProduct}
                initialData={initialAddData}
            />

            {editingProduct && (
                <EditProductModal
                    isOpen={!!editingProduct}
                    product={editingProduct}
                    onClose={() => setEditingProduct(null)}
                    onUpdate={handleUpdateProduct}
                    onDelete={handleDeleteProduct}
                />
            )}
        </div>
    );
}
