const Footer = () => {
  return (
    <footer className="site-footer">
      <p>Test Store © {new Date().getFullYear()} — Crafted with Vite + React.</p>
      <div>
        <a href="https://example.com" target="_blank" rel="noreferrer">
          Shipping policy
        </a>
        <a href="https://example.com" target="_blank" rel="noreferrer">
          Returns
        </a>
        <a href="https://example.com" target="_blank" rel="noreferrer">
          Careers
        </a>
      </div>
    </footer>
  )
}

export default Footer
