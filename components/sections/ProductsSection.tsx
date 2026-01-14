import { useState, useEffect } from 'react';
import { supabase, Product } from '../../lib/supabase';

export default function ProductsSection() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*, images:product_images(*)');

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error loading products:', error);
    }
    setLoading(false);
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);

    try {
      // 1. Crear producto
      const { data: productData, error: productError } = await supabase
        .from('products')
        .insert([
          {
            name: formData.name,
            description: formData.description,
            price: parseFloat(formData.price),
            active: true,
          },
        ])
        .select();

      if (productError) throw productError;
      if (!productData || productData.length === 0) throw new Error('No product created');

      const productId = productData[0].id;

      // 2. Subir imagen si existe
      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${productId}-${Date.now()}.${fileExt}`;
        const filePath = `products/${fileName}`;

        // Subir a Supabase Storage
        const { error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(filePath, imageFile);

        if (uploadError) throw uploadError;

        // Obtener URL pública
        const { data: publicUrlData } = supabase.storage
          .from('product-images')
          .getPublicUrl(filePath);

        // Guardar referencia en BD
        await supabase
          .from('product_images')
          .insert([
            {
              product_id: productId,
              image_url: publicUrlData.publicUrl,
              order_index: 1,
            },
          ]);
      }

      setFormData({ name: '', description: '', price: '' });
      setImageFile(null);
      setShowForm(false);
      loadProducts();
      alert('Producto agregado exitosamente');
    } catch (error) {
      console.error('Error adding product:', error);
      alert(`Error: ${error instanceof Error ? error.message : 'Error al agregar producto'}`);
    } finally {
      setUploading(false);
    }
  };

  const toggleProductStatus = async (productId: number, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('products')
        .update({ active: !currentStatus })
        .eq('id', productId);

      if (error) throw error;
      loadProducts();
    } catch (error) {
      console.error('Error updating product:', error);
    }
  };

  const deleteProduct = async (productId: number) => {
    if (!confirm('¿Eliminar este producto?')) return;

    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId);

      if (error) throw error;
      loadProducts();
      alert('Producto eliminado');
    } catch (error) {
      console.error('Error deleting product:', error);
    }
  };

  if (loading) return <div className="text-center py-8">Cargando productos...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">📦 Productos</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
        >
          {showForm ? 'Cancelar' : '+ Agregar Producto'}
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-bold mb-4">Nuevo Producto</h2>
          <form onSubmit={handleAddProduct}>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-bold mb-2">Nombre</label>
                <input
                  type="text"
                  placeholder="Ej: Pizza Margarita"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-bold mb-2">Precio ($)</label>
                <input
                  type="number"
                  placeholder="0.00"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  required
                />
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-bold mb-2">Descripción</label>
              <textarea
                placeholder="Descripción del producto"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full border rounded px-3 py-2"
                rows={3}
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-bold mb-2">Imagen</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                className="w-full border rounded px-3 py-2"
              />
              {imageFile && (
                <p className="text-sm text-green-600 mt-2">
                  ✓ {imageFile.name}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={uploading}
              className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white font-bold py-2 rounded"
            >
              {uploading ? 'Subiendo...' : 'Crear Producto'}
            </button>
          </form>
        </div>
      )}

      {/* Grid de productos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.map((product) => (
          <div
            key={product.id}
            className={`rounded-lg overflow-hidden shadow-lg ${
              !product.active ? 'opacity-50' : ''
            }`}
          >
            {/* Imagen */}
            {product.images && product.images.length > 0 ? (
              <img
                src={product.images[0].image_url}
                alt={product.name}
                className="w-full h-48 object-cover"
              />
            ) : (
              <div className="w-full h-48 bg-gray-200 flex items-center justify-center">
                <span className="text-gray-400">Sin imagen</span>
              </div>
            )}

            {/* Contenido */}
            <div className="p-4 bg-white">
              <h3 className="text-lg font-bold">{product.name}</h3>
              {product.description && (
                <p className="text-sm text-gray-600 my-2">{product.description}</p>
              )}

              <div className="flex justify-between items-center mb-3">
                <span className="text-2xl font-bold text-green-600">
                  ${product.price.toFixed(2)}
                </span>
                <span
                  className={`px-3 py-1 rounded text-sm font-bold ${
                    product.active
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {product.active ? 'Activo' : 'Inactivo'}
                </span>
              </div>

              {/* Acciones */}
              <div className="flex gap-2">
                <button
                  onClick={() =>
                    toggleProductStatus(product.id, product.active)
                  }
                  className={`flex-1 py-2 rounded font-bold ${
                    product.active
                      ? 'bg-red-500 hover:bg-red-600 text-white'
                      : 'bg-green-500 hover:bg-green-600 text-white'
                  }`}
                >
                  {product.active ? 'Desactivar' : 'Activar'}
                </button>
                <button
                  onClick={() => deleteProduct(product.id)}
                  className="px-3 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded font-bold"
                >
                  🗑️
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {products.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded">
          <p className="text-gray-600">No hay productos. ¡Crea el primero!</p>
        </div>
      )}
    </div>
  );
}
