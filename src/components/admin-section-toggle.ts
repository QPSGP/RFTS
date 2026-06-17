/** Shared class names for admin expandable section buttons (open = shaded until closed). */
export function adminSectionToggleClass(isOpen: boolean, block = false): string {
  const parts = ["button", "button-secondary", "admin-section-toggle"];
  if (block) parts.push("admin-section-toggle--block");
  if (isOpen) parts.push("is-open");
  return parts.join(" ");
}
