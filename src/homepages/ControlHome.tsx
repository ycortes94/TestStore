import Hero from '../components/Hero'
import PlatformPromoBanner from '../components/PlatformPromoBanner'
import Perks from '../components/Perks'
import Testimonials from '../components/Testimonials'
import { isShoppingTab } from '../nav'
import ShoppingTabPanels from './ShoppingTabPanels'
import type { HomepageProps } from './types'

/** Current editorial homepage — Control arm of homepage_revamp_test. */
const ControlHome = (props: HomepageProps) => {
  const shopping = isShoppingTab(props.activeTab)

  return (
    <div className="control-home">
      {shopping && (
        <Hero
          totalProducts={props.totalProducts}
          onPrimaryAction={props.onShopCta}
          onSecondaryAction={props.onBookFitting}
        />
      )}

      {shopping && <PlatformPromoBanner onCta={props.onShopCta} />}

      <main ref={props.catalogRef} id="main-tab-panel" role="tabpanel" aria-live="polite">
        <ShoppingTabPanels {...props} />
      </main>

      {shopping && (
        <>
          <Perks />
          <Testimonials />
        </>
      )}
    </div>
  )
}

export default ControlHome
