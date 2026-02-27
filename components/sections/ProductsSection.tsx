import { useState, useEffect } from 'react';
import { Product, ProductImage } from '../../lib/types';

function ThumbnailStrip({
  product,
  onOpenImage,
}: {
  product: Product;
  onOpenImage: (images: ProductImage[], startIndex: number, productName: string) => void;
}) {
  if (!product.images || product.images.length === 0) {
    return (
      <div className="w-full h-20 bg-gray-100 flex items-center justify-center border-b border-slate-200">
        <span className="text-gray-400 text-sm">Sin imágenes</span>
      </div>
    );
  }

  const resolveImageUrl = (imageUrl: string) => {
    if (!imageUrl) return '';
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://') || imageUrl.startsWith('/')) {
      return imageUrl;
    }
    return `/uploads/products/${imageUrl}`;
  };

  return (
    <div className="border-b border-slate-200 bg-slate-50 px-2 py-2">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {product.images.map((image, index) => (
          <button
            key={image.id}
            type="button"
            onClick={() => onOpenImage(product.images || [], index, product.name)}
            className="shrink-0"
          >
            <img
              src={`${resolveImageUrl(image.image_url)}?v=${image.id}`}
              alt={product.name}
              className="w-14 h-14 sm:w-16 sm:h-16 rounded-md object-cover border border-slate-200 bg-white"
            />
          </button>
        ))}
      </div>
    </div>
  );
}

export default function ProductsSection() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingProductId, setEditingProductId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
  });
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [editFormData, setEditFormData] = useState({
    name: '',
    description: '',
    price: '',
    active: true,
  });
  const [editImageFiles, setEditImageFiles] = useState<File[]>([]);
  const [removeImageIds, setRemoveImageIds] = useState<number[]>([]);
  const [uploading, setUploading] = useState(false);
  const [imageViewer, setImageViewer] = useState<{
    images: ProductImage[];
    index: number;
    productName: string;
  } | null>(null);

  const resolveImageUrl = (imageUrl: string) => {
    if (!imageUrl) return '';
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://') || imageUrl.startsWith('/')) {
      return imageUrl;
    }
    return `/uploads/products/${imageUrl}`;
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const response = await fetch('/api/products');
      const data = await response.json();

      if (!response.ok) throw new Error(data.error || 'Error loading products');
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
      const payload = new FormData();
      payload.append('name', formData.name);
      payload.append('description', formData.description);
      payload.append('price', formData.price);

      imageFiles.forEach((file) => {
        payload.append('images', file);
      });

      const response = await fetch('/api/products', {
        method: 'POST',
        body: payload,
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Error al crear producto');
      }

      setFormData({ name: '', description: '', price: '' });
      setImageFiles([]);
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
      const response = await fetch(`/api/products/${productId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !currentStatus }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Error actualizando producto');
      loadProducts();
    } catch (error) {
      console.error('Error updating product:', error);
    }
  };

  const deleteProduct = async (productId: number) => {
    if (!confirm('¿Eliminar este producto?')) return;

    try {
      const response = await fetch(`/api/products/${productId}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Error eliminando producto');
      loadProducts();
      alert('Producto eliminado');
    } catch (error) {
      console.error('Error deleting product:', error);
    }
  };

  const startEditProduct = (product: Product) => {
    setEditingProductId(product.id);
    setEditFormData({
      name: product.name,
      description: product.description || '',
      price: String(product.price),
      active: product.active,
    });
    setEditImageFiles([]);
    setRemoveImageIds([]);
  };

  const cancelEditProduct = () => {
    setEditingProductId(null);
    setEditImageFiles([]);
    setRemoveImageIds([]);
  };

  const toggleRemoveImage = (imageId: number) => {
    setRemoveImageIds((prev) =>
      prev.includes(imageId) ? prev.filter((id) => id !== imageId) : [...prev, imageId]
    );
  };

  const handleEditProduct = async (e: React.FormEvent, productId: number) => {
    e.preventDefault();
    setUploading(true);

    try {
      const payload = new FormData();
      payload.append('name', editFormData.name);
      payload.append('description', editFormData.description);
      payload.append('price', editFormData.price);
      payload.append('active', String(editFormData.active));
      payload.append('removeImageIds', JSON.stringify(removeImageIds));

      editImageFiles.forEach((file) => {
        payload.append('images', file);
      });

      const response = await fetch(`/api/products/${productId}`, {
        method: 'PUT',
        body: payload,
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Error actualizando producto');

      cancelEditProduct();
      loadProducts();
      alert('Producto actualizado exitosamente');
    } catch (error) {
      console.error('Error updating product:', error);
      alert(`Error: ${error instanceof Error ? error.message : 'Error al actualizar producto'}`);
    } finally {
      setUploading(false);
    }
  };

  const openImageViewer = (images: ProductImage[], startIndex: number, productName: string) => {
    if (!images.length) return;
    setImageViewer({ images, index: startIndex, productName });
  };

  const closeImageViewer = () => {
    setImageViewer(null);
  };

  const previousImage = () => {
    if (!imageViewer) return;
    const nextIndex = (imageViewer.index - 1 + imageViewer.images.length) % imageViewer.images.length;
    setImageViewer({ ...imageViewer, index: nextIndex });
  };

  const nextImage = () => {
    if (!imageViewer) return;
    const nextIndex = (imageViewer.index + 1) % imageViewer.images.length;
    setImageViewer({ ...imageViewer, index: nextIndex });
  };

  if (loading) return <div className="text-center py-8">Cargando productos...</div>;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold">📦 Productos</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-semibold"
        >
          {showForm ? 'Cancelar' : '+ Agregar Producto'}
        </button>
      </div>

      {showForm && (
        <div className="panel-card p-4 sm:p-6 mb-8">
          <h2 className="text-xl font-bold mb-4">Nuevo Producto</h2>
          <form onSubmit={handleAddProduct}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
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
              <label className="block text-sm font-bold mb-2">Imágenes</label>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => setImageFiles(Array.from(e.target.files || []))}
                className="w-full border rounded px-3 py-2"
              />
              {imageFiles.length > 0 && (
                <div className="mt-2 text-sm text-green-600">
                  {imageFiles.map((file) => (
                    <p key={file.name + file.size}>✓ {file.name}</p>
                  ))}
                </div>
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
            className={`panel-card overflow-hidden w-full mx-auto ${
              !product.active ? 'opacity-50' : ''
            }`}
          >
            <ThumbnailStrip product={product} onOpenImage={openImageViewer} />

            {/* Contenido */}
            <div className="p-3 bg-white min-h-[210px] flex flex-col">
              {editingProductId === product.id ? (
                <form onSubmit={(e) => handleEditProduct(e, product.id)}>
                  <div className="mb-3">
                    <label className="block text-sm font-bold mb-1">Nombre</label>
                    <input
                      type="text"
                      value={editFormData.name}
                      onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                      className="w-full border rounded px-3 py-2"
                      required
                    />
                  </div>

                  <div className="mb-3">
                    <label className="block text-sm font-bold mb-1">Descripción</label>
                    <textarea
                      value={editFormData.description}
                      onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                      className="w-full border rounded px-3 py-2"
                      rows={2}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                    <div>
                      <label className="block text-sm font-bold mb-1">Precio ($)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={editFormData.price}
                        onChange={(e) => setEditFormData({ ...editFormData, price: e.target.value })}
                        className="w-full border rounded px-3 py-2"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold mb-1">Estado</label>
                      <select
                        value={editFormData.active ? 'active' : 'inactive'}
                        onChange={(e) =>
                          setEditFormData({ ...editFormData, active: e.target.value === 'active' })
                        }
                        className="w-full border rounded px-3 py-2"
                      >
                        <option value="active">Activo</option>
                        <option value="inactive">Inactivo</option>
                      </select>
                    </div>
                  </div>

                  {product.images && product.images.length > 0 && (
                    <div className="mb-3">
                      <label className="block text-sm font-bold mb-1">Imágenes actuales (selecciona para quitar)</label>
                      <div className="grid grid-cols-4 gap-2">
                        {product.images.map((image) => {
                          const markedToRemove = removeImageIds.includes(image.id);
                          return (
                            <button
                              key={image.id}
                              type="button"
                              onClick={() => toggleRemoveImage(image.id)}
                              className={`relative border rounded overflow-hidden ${
                                markedToRemove ? 'ring-2 ring-red-500' : ''
                              }`}
                            >
                              <img src={`${resolveImageUrl(image.image_url)}?v=${image.id}`} alt={product.name} className="w-full h-14 object-cover" />
                              {markedToRemove && (
                                <span className="absolute inset-0 bg-red-600/50 text-white text-xs flex items-center justify-center">
                                  Quitar
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="mb-3">
                    <label className="block text-sm font-bold mb-1">Agregar nuevas imágenes</label>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(e) => setEditImageFiles(Array.from(e.target.files || []))}
                      className="w-full border rounded px-3 py-2"
                    />
                    {editImageFiles.length > 0 && (
                      <div className="mt-2 text-sm text-green-600">
                        {editImageFiles.map((file) => (
                          <p key={file.name + file.size + file.lastModified}>✓ {file.name}</p>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={uploading}
                      className="flex-1 py-2 rounded font-bold bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white"
                    >
                      {uploading ? 'Guardando...' : 'Guardar Cambios'}
                    </button>
                    <button
                      type="button"
                      onClick={cancelEditProduct}
                      className="px-3 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded font-bold"
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  <h3 className="text-base font-bold">{product.name}</h3>
                  {product.description && (
                    <p className="text-xs text-gray-600 my-1">{product.description}</p>
                  )}

                  <div className="flex justify-between items-center mb-3 mt-1">
                    <span className="text-xl font-bold text-green-600">
                      ${product.price.toFixed(2)}
                    </span>
                    <span
                      className={`px-2 py-1 rounded text-xs font-bold ${
                        product.active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {product.active ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>

                  <div className="flex gap-1.5 mt-auto">
                    <button
                      onClick={() => startEditProduct(product)}
                      className="flex-1 py-1.5 rounded font-bold text-sm bg-blue-500 hover:bg-blue-600 text-white"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() =>
                        toggleProductStatus(product.id, product.active)
                      }
                      className={`flex-1 py-1.5 rounded font-bold text-sm ${
                        product.active
                          ? 'bg-red-500 hover:bg-red-600 text-white'
                          : 'bg-green-500 hover:bg-green-600 text-white'
                      }`}
                    >
                      {product.active ? 'Desactivar' : 'Activar'}
                    </button>
                    <button
                      onClick={() => deleteProduct(product.id)}
                      className="px-2.5 py-1.5 bg-gray-500 hover:bg-gray-600 text-white rounded font-bold text-sm"
                    >
                      🗑️
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {products.length === 0 && (
        <div className="text-center py-12 bg-slate-50 rounded-xl border border-slate-200">
          <p className="text-gray-600">No hay productos. ¡Crea el primero!</p>
        </div>
      )}

      {imageViewer && imageViewer.images[imageViewer.index] && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={closeImageViewer}>
          <div
            className="relative panel-card bg-slate-900 border-slate-700 max-w-4xl w-full p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-slate-100 font-semibold">
                {imageViewer.productName} · {imageViewer.index + 1}/{imageViewer.images.length}
              </p>
              <button
                type="button"
                onClick={closeImageViewer}
                className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-sm"
              >
                Cerrar ✕
              </button>
            </div>

            <div className="relative flex items-center justify-center">
              <img
                src={`${resolveImageUrl(imageViewer.images[imageViewer.index].image_url)}?v=${imageViewer.images[imageViewer.index].id}`}
                alt={imageViewer.productName}
                className="max-h-[70vh] w-auto max-w-full rounded-lg object-contain"
              />

              {imageViewer.images.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={previousImage}
                    className="absolute left-2 sm:left-4 px-3 py-2 rounded-lg bg-black/60 hover:bg-black/75 text-white text-sm"
                  >
                    ← Anterior
                  </button>
                  <button
                    type="button"
                    onClick={nextImage}
                    className="absolute right-2 sm:right-4 px-3 py-2 rounded-lg bg-black/60 hover:bg-black/75 text-white text-sm"
                  >
                    Siguiente →
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
