import { Nav } from "@/components/Nav";
import { Hero } from "@/components/Hero";
import { WorksWith } from "@/components/WorksWith";
import { LiveDemo } from "@/components/LiveDemo";
import { Roles } from "@/components/Roles";
import { Testimonials } from "@/components/Testimonials";
import { FinalCta } from "@/components/FinalCta";
import { Footer } from "@/components/Footer";
import { Reveal } from "@/components/Reveal";

export default function Home() {
  return (
    <>
      <Nav />
      <Hero />
      <WorksWith />
      <LiveDemo />
      <Roles />
      <Testimonials />
      <FinalCta />
      <Footer />
      <Reveal />
    </>
  );
}
