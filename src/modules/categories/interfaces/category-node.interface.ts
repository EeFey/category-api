export interface CategoryNode {
  id: bigint;
  name: string;
  parentId: bigint | null;
  children: CategoryNode[];
  attributeCount?: number;
  productCount?: number;
}