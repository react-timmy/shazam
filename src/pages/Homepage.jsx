import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Zap } from "lucide-react";
import { useAuth } from "../contexts/AuthContext"; // Imported Auth Context
import Logo from "../components/Logo";
import LightningOverlay from "../components/LightningOverlay";
import "./Homepage.css";

/* ── Nav ── */
function NavBar() {
  const { user } = useAuth(); // Accessing user state
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 30);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);

  return (
    <>
      <nav className={`hp-nav ${scrolled ? "hp-nav--scrolled" : ""}`}>
        <Logo />

        <div className="hp-nav__links">
          <a href="#how">How it works</a>
          <a href="#features">Features</a>
          <a href="#pricing">Pricing</a>
          <a href="#faq">FAQ</a>
        </div>
        <div className="hp-nav__right">
          {!user ? (
            <>
              <Link to="/login" className="hp-nav__signin">
                Sign in
              </Link>
              <Link to="/signup" className="hp-nav__cta">
                Get Started
              </Link>
            </>
          ) : (
            <Link to="/dashboard" className="hp-nav__cta">
              Dashboard
            </Link>
          )}
        </div>
        <button
          className="hp-nav__hamburger"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            {mobileOpen ? (
              <path
                d="M3 3l14 14M17 3L3 17"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            ) : (
              <path
                d="M3 5h14M3 10h14M3 15h14"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            )}
          </svg>
        </button>
      </nav>
      {mobileOpen && (
        <div className="hp-nav__drawer">
          <a href="#how" onClick={() => setMobileOpen(false)}>
            How it works
          </a>
          <a href="#features" onClick={() => setMobileOpen(false)}>
            Features
          </a>
          <a href="#pricing" onClick={() => setMobileOpen(false)}>
            Pricing
          </a>
          <a href="#faq" onClick={() => setMobileOpen(false)}>
            FAQ
          </a>
          {!user ? (
            <>
              <Link to="/login" onClick={() => setMobileOpen(false)}>
                Sign in
              </Link>
              <Link
                to="/signup"
                className="hp-nav__drawer-cta"
                onClick={() => setMobileOpen(false)}
              >
                Get Started →
              </Link>
            </>
          ) : (
            <Link
              to="/dashboard"
              className="hp-nav__drawer-cta"
              onClick={() => setMobileOpen(false)}
            >
              Go to Dashboard
            </Link>
          )}
        </div>
      )}
    </>
  );
}

/* ── Before/After slider ── */
function BASlider() {
  const [pos, setPos] = useState(50);
  const ref = useRef();
  const move = (clientX) => {
    const r = ref.current.getBoundingClientRect();
    setPos(Math.min(100, Math.max(0, ((clientX - r.left) / r.width) * 100)));
  };
  return (
    <div className="ba__window">
      <div className="ba__titlebar">
        <div className="ba__traffic-lights">
          <div className="ba__dot ba__dot--red"></div>
          <div className="ba__dot ba__dot--yellow"></div>
          <div className="ba__dot ba__dot--green"></div>
        </div>
        <span className="ba__title">Drag to compare</span>
      </div>
      <div
        className="ba"
        ref={ref}
        onMouseMove={(e) => e.buttons === 1 && move(e.clientX)}
        onTouchMove={(e) => move(e.touches[0].clientX)}
      >
        <div className="ba__after-base">
          <img
            src="https://i.imgur.com/eHvilve.png"
            alt="After"
            className="ba__image"
          />
          <div
            className="ba__label ba__label--right"
            style={{ opacity: Math.max(0, (pos - 30) / 20) }}
          >
            <span className="ba__pct ba__pct--good">95%</span>
            <span>match</span>
            <p>SHAZAM spec →</p>
          </div>
        </div>
        <div
          className="ba__before-clip"
          style={{ clipPath: `inset(0 0 0 ${pos}%)` }}
        >
          <img
            src="https://i.imgur.com/aDvP0FV.png"
            alt="Before"
            className="ba__image"
          />
          <div
            className="ba__label ba__label--left"
            style={{ opacity: Math.max(0, (70 - pos) / 20) }}
          >
            <span className="ba__pct">60%</span>
            <span>match</span>
            <p>"Build this page"</p>
          </div>
        </div>
        <div className="ba__handle" style={{ left: `${pos}%` }}>
          <div className="ba__handle-line" />
          <div className="ba__handle-pill">
            <Zap
              width={18}
              height={18}
              strokeWidth={2.5}
              className="ba__handle-icon"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── FAQ accordion ── */
const FAQ_ITEMS = [
  {
    q: "How is this different from just pasting a screenshot into ChatGPT?",
    a: "ChatGPT gives you a generic description. SHAZAM outputs a structured engineering spec — exact hex codes, pixel measurements, component hierarchy, responsive breakpoints, animation timing — formatted specifically for AI coding tools like Cursor, Bolt, and v0 to build from.",
  },
  {
    q: "What AI tools does the output work with?",
    a: "Any tool that accepts a text prompt. The spec is optimised for Cursor, Claude Code, Windsurf, Bolt, v0, Lovable, and Replit Agent. Copy it in, get a 95% match instead of 60%.",
  },
  {
    q: "Can I upload multiple screens?",
    a: "Yes — up to 5 images per project. Upload your full user flow and SHAZAM maps the relationships between screens into a single cohesive spec.",
  },
  {
    q: "Do you store my designs?",
    a: "Designs are sent to Gemini for analysis and are not stored on our servers. Generated specs are saved locally in your browser under your account.",
  },
  {
    q: "What if the generated spec isn't perfect?",
    a: "Use the Fix Prompt panel — describe what's off and get a targeted correction prompt. You can also switch to Edit mode and adjust the spec manually before pasting it into your tool.",
  },
  {
    q: "Is there a free tier?",
    a: "Yes. The free tier includes 20 prompts per month and 3 asset generations with no credit card required. You only need a free Gemini API key from Google AI Studio.",
  },
];

function FAQItem({ item }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`faq-item ${open ? "faq-item--open" : ""}`}>
      <button className="faq-item__q" onClick={() => setOpen(!open)}>
        <span>{item.q}</span>
        <svg
          width="18"
          height="18"
          viewBox="0 0 18 18"
          fill="none"
          className="faq-item__icon"
        >
          <path
            d={open ? "M4 11l5-5 5 5" : "M4 7l5 5 5-5"}
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      {open && <p className="faq-item__a">{item.a}</p>}
    </div>
  );
}

/* ── Team ── */
const TEAM = [
  {
    name: "Timmy Cole",
    role: "Founder & Full-stack Developer",
    bio: "Solo indie builder with years of web3 and full-stack experience. Built SHAZAM to fix the one thing that slows every developer down - translating a visual into working code.",
    x: "https://twitter.com",
    avatar: "https://i.imgur.com/pxB3XsE.jpeg",
    isImage: true,
  },
];

/* ── Static data ── */
const STEPS = [
  {
    num: "01",
    title: "Upload",
    body: "Drop in a screenshot, Figma export, or Dribbble shot. Any visual works.",
    icon: "↑",
  },
  {
    num: "02",
    title: "Analyze",
    body: "SHAZAM breaks down layout, spacing, hierarchy, responsive behavior, and every visual pattern.",
    icon: "⬡",
  },
  {
    num: "03",
    title: "Build",
    body: "Paste the spec into Cursor, Claude Code, Lovable, or Bolt. Get 95% match, not 60%.",
    icon: "✓",
  },
];

const FEATURES = [
  {
    icon: "⬡",
    title: "Design-aware analysis",
    body: "Layout grid, visual hierarchy, spacing tokens, overlap logic, color relationships.",
  },
  {
    icon: "✎",
    title: "Editable specs",
    body: "Read the output. Change what matters. Remove what doesn't. You control the AI.",
  },
  {
    icon: "⊞",
    title: "Responsive by default",
    body: 'Breakpoints, reflow behavior, stacking order. No more three rounds of "make it responsive."',
  },
  {
    icon: "≡",
    title: "Prompt library",
    body: "Save and revisit prompts. Build a reusable library of implementation specs.",
  },
  {
    icon: "⊕",
    title: "Multi-image projects",
    body: "Upload multiple screens for richer context and full user flow mapping.",
  },
  {
    icon: "↓",
    title: "Export as markdown",
    body: "Clean markdown for docs and dev handoff. Version-control your specs.",
  },
];

const PLANS = [
  {
    name: "Free",
    price: "$0",
    features: [
      "20 prompts/month",
      "3 asset generations",
      "Design analysis",
      "Basic prompts",
    ],
    cta: "Start Free",
  },
  {
    name: "Starter",
    price: "$7",
    period: "mo",
    features: [
      "100 prompts/month",
      "20 asset generations",
      "All AI tools",
      "Full asset library",
      "Cancel anytime",
    ],
    cta: "Start Starter",
  },
  {
    name: "Pro",
    price: "$15",
    period: "mo",
    featured: true,
    features: [
      "Unlimited generations",
      "Up to 10 images/project",
      "Priority processing",
      "100 asset generations",
      "Early access features",
    ],
    cta: "Start Pro",
  },
  {
    name: "Agency",
    price: "$49",
    period: "mo",
    features: [
      "Unlimited everything",
      "Team seats (5 users)",
      "White-label export",
      "Dedicated support",
    ],
    cta: "Start Agency",
  },
];

/* ══════════════════════════════════════════════
   PAGE
══════════════════════════════════════════════ */
export default function Homepage() {
  const { user } = useAuth(); // Accessing user state for Hero section

  return (
    <div className="hp">
      <LightningOverlay />
      <NavBar />

      <section className="hp-hero">
        <div className="hp-hero__bg-glow hp-hero__bg-glow--blue" />
        <div className="hp-hero__bg-glow hp-hero__bg-glow--orange" />
        <div className="hp-hero__grid-lines" />

        <div className="hp-hero__center">
          <div className="hp-hero__eyebrow">
            <span className="hp-hero__bolt-icon">⚡</span>
            AI-powered design intelligence
          </div>
          <h1 className="hp-hero__h1">
            Your AI is guessing.
            <br />
            <span className="hp-hero__h1-accent">Give it a blueprint.</span>
          </h1>
          <p className="hp-hero__desc">
            Upload any design. SHAZAM generates an implementation spec so
            detailed,
            <br className="hp-hero__br" />
            your AI tool builds it right the first time.
          </p>
          <div className="hp-hero__actions">
            {!user ? (
              <>
                <Link to="/signup" className="hp-hero__cta-primary">
                  <svg
                    width="14"
                    height="19"
                    viewBox="0 0 14 19"
                    fill="currentColor"
                  >
                    <path d="M10 0L2 10H7.5L1 19L13 9H7.5L10 0Z" />
                  </svg>
                  Get Started Free
                </Link>
                <Link to="/login" className="hp-hero__cta-ghost">
                  Sign In →
                </Link>
              </>
            ) : (
              <Link to="/dashboard" className="hp-hero__cta-primary">
                <svg
                  width="14"
                  height="19"
                  viewBox="0 0 14 19"
                  fill="currentColor"
                >
                  <path d="M10 0L2 10H7.5L1 19L13 9H7.5L10 0Z" />
                </svg>
                Go to Dashboard
              </Link>
            )}
          </div>
          <p className="hp-hero__note">Free tier · No credit card required</p>
        </div>
      </section>

      <section className="hp-section hp-section--ba" id="how">
        <div className="hp-section__label">Before &amp; After</div>
        <h2 className="hp-section__h2">
          Same design.
          <br />
          One prompt actually works.
        </h2>
        <p className="hp-section__p">
          Drag to compare a generic prompt vs. a SHAZAM spec.
        </p>
        <BASlider />
      </section>

      <section className="hp-section" id="steps">
        <div className="hp-section__label">How it works</div>
        <h2 className="hp-section__h2">
          Three steps.
          <br />
          That's the whole workflow.
        </h2>
        <div className="hp-steps">
          {STEPS.map((s, i) => (
            <div key={i} className="hp-step">
              <div className="hp-step__num">{s.num}</div>
              <div className="hp-step__icon">{s.icon}</div>
              <h3 className="hp-step__title">{s.title}</h3>
              <p className="hp-step__body">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="hp-section" id="features">
        <div className="hp-section__label">What it actually sees</div>
        <h2 className="hp-section__h2">
          Every pixel,
          <br />
          mapped and understood.
        </h2>
        <div className="hp-features">
          {FEATURES.map((f, i) => (
            <div key={i} className="hp-feature">
              <div className="hp-feature__icon">{f.icon}</div>
              <h3 className="hp-feature__title">{f.title}</h3>
              <p className="hp-feature__body">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="hp-section" id="team">
        <div className="hp-section__label">The team</div>
        <h2 className="hp-section__h2">
          The developers
          <br />
          behind this project.
        </h2>
        <p className="hp-section__p">
          Built by people who got tired of prompting the wrong thing.
        </p>
        <div className="hp-team">
          {TEAM.map((member, i) => (
            <div key={i} className="hp-team-card">
              <div
                className="hp-team-card__avatar"
                style={member.isImage ? {} : { background: member.color }}
              >
                {member.isImage ? (
                  <img
                    src={member.avatar}
                    alt={member.name}
                    className="hp-team-card__avatar-img"
                  />
                ) : (
                  member.avatar
                )}
              </div>
              <div className="hp-team-card__body">
                <div className="hp-team-card__top">
                  <div>
                    <h3 className="hp-team-card__name">{member.name}</h3>
                    <p className="hp-team-card__role">{member.role}</p>
                  </div>
                  <a
                    href={member.x}
                    target="_blank"
                    rel="noreferrer"
                    className="hp-team-card__x"
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="currentColor"
                    >
                      <path d="M12.6 1h2.4L9.8 6.6 16 15h-4.5l-3.7-4.9L3.5 15H1.1l5.5-6L0 1h4.6l3.4 4.4L12.6 1zm-.8 12.6h1.3L4.3 2.3H2.9l9 11.3z" />
                    </svg>
                  </a>
                </div>
                <p className="hp-team-card__bio">{member.bio}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="hp-section" id="pricing">
        <div className="hp-section__label">Pricing</div>
        <h2 className="hp-section__h2">
          Simple pricing.
          <br />
          Start free.
        </h2>
        <div className="hp-pricing">
          {PLANS.map((p, i) => (
            <div
              key={i}
              className={`hp-plan ${p.featured ? "hp-plan--featured" : ""}`}
            >
              {p.featured && (
                <div className="hp-plan__badge">⚡ MOST POPULAR</div>
              )}
              <div className="hp-plan__name">{p.name}</div>
              <div className="hp-plan__price">
                {p.price}
                {p.period && <span className="hp-plan__per">/{p.period}</span>}
              </div>
              <ul className="hp-plan__list">
                {p.features.map((f, j) => (
                  <li key={j}>
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path
                        d="M1.5 6l3 3 6-6"
                        stroke={
                          p.featured ? "var(--lightning)" : "var(--orange)"
                        }
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                to="/signup"
                className={`hp-plan__btn ${p.featured ? "hp-plan__btn--featured" : ""}`}
              >
                {p.featured && (
                  <svg
                    width="12"
                    height="16"
                    viewBox="0 0 12 16"
                    fill="currentColor"
                  >
                    <path d="M9 0L2 8H6.5L1 16L10.5 6H6L9 0Z" />
                  </svg>
                )}
                {p.cta}
              </Link>
            </div>
          ))}
        </div>
      </section>

      <section className="hp-section" id="faq">
        <div className="hp-section__label">Questions</div>
        <h2 className="hp-section__h2">
          Everything you
          <br />
          need to know.
        </h2>
        <div className="hp-faq">
          {FAQ_ITEMS.map((item, i) => (
            <FAQItem key={i} item={item} />
          ))}
        </div>
      </section>

      <footer className="hp-footer">
        <Logo />
        <p className="hp-footer__copy">
          © 2026 SHAZAM. Give your AI a blueprint.
        </p>
        <div className="hp-footer__links">
          <a href="#">Privacy</a>
          <a href="#">Terms</a>
          <a href="https://twitter.com" target="_blank" rel="noreferrer">
            Twitter/X
          </a>
        </div>
      </footer>
    </div>
  );
}
