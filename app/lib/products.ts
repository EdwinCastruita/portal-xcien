// Utilidades de presentación para productos de Odoo (`product.product`).

export interface PortalProduct {
  id: number;
  name: string;
  /** Referencia interna de Odoo (`default_code`), p. ej. "SID-10". */
  default_code?: string;
  /** Valores de variante, p. ej. ["10 Mbps"]. */
  variant_attributes?: string[];
  price: number;
}

// Etiqueta estilo Odoo: "SID-10 - Internet Dedicado". Muchas variantes
// comparten nombre, así que la referencia interna es lo que las distingue;
// al ir dentro de la etiqueta también entra en la búsqueda del SmartSelector.
export function productLabel(p: { name: string; default_code?: string }) {
  return p.default_code ? `${p.default_code} - ${p.name}` : p.name;
}

// Normaliza un producto de `POST /products` al formato que usan las páginas.
export function mapPortalProduct(p: {
  id: number;
  name: string;
  default_code?: string | false;
  variant_attributes?: string[];
  list_price?: number;
  price?: number;
}): PortalProduct {
  return {
    id: p.id,
    name: p.name,
    default_code: p.default_code || "",
    variant_attributes: Array.isArray(p.variant_attributes) ? p.variant_attributes : [],
    price: p.list_price ?? p.price ?? 0,
  };
}

// Opción lista para el SmartSelector: código + nombre, variante como subtítulo.
export function productOption(p: PortalProduct) {
  return {
    id: p.id,
    name: productLabel(p),
    subtitle: p.variant_attributes?.join(", ") || undefined,
    extra: `$${Number(p.price || 0).toLocaleString()}`,
  };
}
