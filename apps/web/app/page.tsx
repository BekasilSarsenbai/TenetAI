import { Nav } from "@/components/Nav";
import { Hero } from "@/components/Hero";
import { TraceDemo } from "@/components/TraceDemo";
import { Synthesis } from "@/components/Synthesis";
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
      <TraceDemo />
      <Synthesis />
      <Roles />
      <Testimonials />
      <FinalCta />
      <Footer />
      <Reveal />
    </>
  );
}
