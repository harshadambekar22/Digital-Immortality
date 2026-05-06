import './App.css'

export default function App() {
  return (
    <div className="landing">
      <header id="home" className="landing-nav">
        <h1 className="logo">
          <span className="logo-mark" aria-hidden="true">
            DI
          </span>
          Digital Immortality
        </h1>
        <nav className="nav-links" aria-label="Main navigation">
          <a className="nav-link" href="#home">
            Home
          </a>
          <a className="nav-link" href="#about">
            About
          </a>
          <a className="nav-link" href="#features">
            Features
          </a>
          <a className="nav-link" href="#contact">
            Contact
          </a>
        </nav>
      </header>

      <main>
        <section className="hero">
          <p className="eyebrow">Preserve your consciousness using AI</p>
          <h2>Create your interactive digital persona</h2>
          <p className="hero-copy">
            Build an AI self that learns from your conversations, memories, and
            preferences. Capture your voice, values, and story so your digital
            presence can continue to guide, support, and reflect who you are.
          </p>
          <div className="hero-actions">
            <a className="btn primary" href="#get-started">
              Start Building
            </a>
            <a className="btn ghost" href="#how">
              See How It Works
            </a>
          </div>
        </section>

        <section id="about" className="section">
          <h3>About the vision</h3>
          <p className="about-copy">
            Digital Immortality helps you preserve your identity as a living,
            interactive AI persona. It learns from your words, memories, and
            preferences to reflect your communication style, values, and story with
            continuity over time.
          </p>
        </section>

        <section id="features" className="section">
          <h3>Core capabilities</h3>
          <div className="grid">
            <article className="card">
              <h4>Conversation Memory</h4>
              <p>
                Your persona continuously improves from ongoing chats and saved
                context.
              </p>
            </article>
            <article className="card">
              <h4>Personal Knowledge Vault</h4>
              <p>
                Store life moments, beliefs, relationships, and milestones as
                long-term memory.
              </p>
            </article>
            <article className="card">
              <h4>Preference Learning</h4>
              <p>
                Capture communication style, tone, boundaries, and values for more
                authentic responses.
              </p>
            </article>
            <article className="card">
              <h4>Voice Interaction</h4>
              <p>
                Speak naturally with speech-to-text input and optional spoken AI
                replies.
              </p>
            </article>
            <article className="card">
              <h4>Backup & Restore</h4>
              <p>
                Keep your persona portable with export/import for your memory data.
              </p>
            </article>
            <article className="card">
              <h4>Insights & Growth</h4>
              <p>
                Track persona quality and get prompts that improve identity
                accuracy over time.
              </p>
            </article>
          </div>
        </section>

        <section id="how" className="section">
          <h3>How it works</h3>
          <ol className="steps">
            <li>Share your story through chat, memories, and preferences.</li>
            <li>AI synthesizes patterns, personality, and communication style.</li>
            <li>Your digital persona responds with continuity and authenticity.</li>
          </ol>
        </section>

        <section id="get-started" className="section cta">
          <h3>Begin your digital legacy today</h3>
          <p>
            Start with a few memories and a short conversation. Your persona will
            evolve as you share more.
          </p>
          <a className="btn primary" href="#">
            Launch Experience
          </a>
        </section>

        <section id="contact" className="section contact">
          <h3>Contact</h3>
          <p>
            Want to collaborate, test, or contribute? Reach out and help shape a
            responsible future for identity-preserving AI experiences.
          </p>
          <a className="btn ghost" href="mailto:hello@digitalimmortality.ai">
            Contact Team
          </a>
        </section>
      </main>

      <footer className="landing-footer">
        <p>Digital Immortality · Preserve identity with ethical AI continuity.</p>
      </footer>
    </div>
  )
}
