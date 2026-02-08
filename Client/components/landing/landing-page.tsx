import { Hero } from './hero'
import { HowItWorks } from './how-it-works'
import { Services } from './services'
import { About } from './about'

/**
 * LandingPage component - Composition of all landing page sections
 * Use this to render the complete landing page in app/page.tsx
 */
export interface LandingPageProps {
  showHero?: boolean
  showHowItWorks?: boolean
  showServices?: boolean
  showAbout?: boolean
  onHeroCtaClick?: () => void
}

export function LandingPage({
  showHero = true,
  showHowItWorks = true,
  showServices = true,
  showAbout = true,
  onHeroCtaClick,
}: LandingPageProps) {
  return (
    <main className="w-full">
      {showHero && <Hero onCtaClick={onHeroCtaClick} />}
      {showHowItWorks && <HowItWorks />}
      {showServices && <Services />}
      {showAbout && <About />}
    </main>
  )
}
