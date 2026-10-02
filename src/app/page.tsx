import { BlogsSection } from "@/components/sections/blogs";
import { CertificationsSection } from "@/components/sections/certifications";
import { ContactSection } from "@/components/sections/contact";
import { EducationSection } from "@/components/sections/education";
import { HeroSection } from "@/components/sections/hero";
import { ProjectsSection } from "@/components/sections/projects";
import { ResearchSection } from "@/components/sections/research";
import { SkillsSection } from "@/components/sections/skills";

/** One column, one scroll. Order is fixed; the copy in each section is not. */
export default function HomePage() {
  return (
    <main>
      <HeroSection />
      <EducationSection />
      <ResearchSection />
      <ProjectsSection />
      <BlogsSection />
      <SkillsSection />
      <CertificationsSection />
      <ContactSection />
    </main>
  );
}
