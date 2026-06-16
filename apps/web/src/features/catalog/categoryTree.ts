import type { Category } from "@marketplace/contracts";

export interface CategoryTreeNode extends Category {
  children: CategoryTreeNode[];
}

export function buildCategoryTree(categories: Category[]): CategoryTreeNode[] {
  const nodes = new Map<string, CategoryTreeNode>(
    categories.map((category) => [category.id, { ...category, children: [] }]),
  );
  const roots: CategoryTreeNode[] = [];

  for (const node of nodes.values()) {
    const parent = node.parentId ? nodes.get(node.parentId) : undefined;
    if (parent) {
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  }

  // Сортировка применяется на каждом уровне, чтобы раскрытие веток
  // не меняло предсказуемый алфавитный порядок каталога.
  function sortBranch(branch: CategoryTreeNode[]): void {
    branch.sort((left, right) => left.name.localeCompare(right.name, "ru"));
    branch.forEach((node) => sortBranch(node.children));
  }
  sortBranch(roots);
  return roots;
}
