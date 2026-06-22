"use client";

import { useDict } from "@/lib/i18n";
import { SIGN_IN_URL } from "@/lib/app-url";
import { Logo } from "./Logo";

export function Footer() {
  const t = useDict();
  const { product, company, resources } = t.footer.cols;

  return (
    <footer className="footer">
      <div className="wrap">
        <div className="footcols">
          <div>
            <div className="brand">
              <Logo size={20} /> Tenet
            </div>
            <p className="tag2">{t.footer.tagline}</p>
          </div>
          <div className="fcol">
            <h5>{product.title}</h5>
            <ul>
              <li>
                <a href="#trace">{product.links[0]}</a>
              </li>
              <li>
                <a href="#synthesis">{product.links[1]}</a>
              </li>
              <li>
                <a href={SIGN_IN_URL}>{product.links[2]}</a>
              </li>
            </ul>
          </div>
          <div className="fcol">
            <h5>{company.title}</h5>
            <ul>
              {company.links.map((link) => (
                <li key={link}>
                  <a href="#">{link}</a>
                </li>
              ))}
            </ul>
          </div>
          <div className="fcol">
            <h5>{resources.title}</h5>
            <ul>
              {resources.links.map((link) => (
                <li key={link}>
                  <a href="#">{link}</a>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="footbar">
          <span>{t.footer.copyright}</span>
          <span>{t.footer.madeFor}</span>
        </div>
      </div>
    </footer>
  );
}
