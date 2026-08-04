export type NavTabId = 'new-arrivals' | 'best-sellers' | 'studio-kits' | 'journal' | 'support'

export const NAV_TABS: { id: NavTabId; label: string }[] = [
  { id: 'new-arrivals', label: 'New Arrivals' },
  { id: 'best-sellers', label: 'Best Sellers' },
  { id: 'studio-kits', label: 'Studio Kits' },
  { id: 'journal', label: 'Journal' },
  { id: 'support', label: 'Support' },
]

export const isShoppingTab = (tab: NavTabId): boolean =>
  tab === 'new-arrivals' || tab === 'best-sellers' || tab === 'studio-kits'
