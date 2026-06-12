"use client";

function focusWaitlist() {
  window.scrollTo({ top: 0, behavior: "smooth" });
  const inp = document.querySelector<HTMLInputElement>("#waitlistTop input");
  if (inp) setTimeout(() => inp.focus(), 320);
}

export function Footer() {
  return (
    <footer className="footer">
      <div className="wrap">
        <div className="footcols">
          <div>
            <div className="brand">
              <span className="dot" /> Tenet
            </div>
            <p className="tag2">The AI notetaker built around trust. Every insight traced to its source.</p>
          </div>
          <div className="fcol">
            <h5>Product</h5>
            <ul>
              <li>
                <a href="#trace">Source links</a>
              </li>
              <li>
                <a href="#synthesis">Synthesis</a>
              </li>
              <li>
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    focusWaitlist();
                  }}
                >
                  Waitlist
                </a>
              </li>
            </ul>
          </div>
          <div className="fcol">
            <h5>Company</h5>
            <ul>
              <li><a href="#">About</a></li>
              <li><a href="#">Blog</a></li>
              <li><a href="#">Careers</a></li>
              <li><a href="#">Contact</a></li>
            </ul>
          </div>
          <div className="fcol">
            <h5>Resources</h5>
            <ul>
              <li><a href="#">Help center</a></li>
              <li><a href="#">Privacy</a></li>
              <li><a href="#">Terms</a></li>
              <li><a href="#">Security</a></li>
            </ul>
          </div>
        </div>
        <div className="footbar">
          <span>© 2026 Tenet. All rights reserved.</span>
          <span>Made for people who reuse what was said.</span>
        </div>
      </div>
    </footer>
  );
}
