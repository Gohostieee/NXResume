import type {
  Award,
  Certification,
  CustomSection,
  CustomSectionGroup,
  Education,
  Experience,
  Interest,
  Language,
  Profile,
  Project,
  Publication,
  Reference,
  SectionKey,
  SectionWithItem,
  Skill,
  URL,
  Volunteer,
} from "@reactive-resume/schema";

import { isEmptyString, isUrl, sanitize } from "@reactive-resume/utils";
import get from "lodash.get";
import { Fragment, type ReactNode } from "react";

import { useArtboardStore } from "../artboard/store/artboard";
import type { TemplateProps } from "./types";

const SectionHeading = ({ title }: { title: string }) => (
  <h4 className="mb-2 font-bold" style={{ textAlign: "center" }}>
    {title}
  </h4>
);

const Header = () => {
  const basics = useArtboardStore((state) => state.resume.basics);

  const contactItems: Array<{ key: string; node: ReactNode }> = [];

  if (basics.location) {
    contactItems.push({ key: "location", node: <span>{basics.location}</span> });
  }

  if (basics.email) {
    contactItems.push({
      key: "email",
      node: (
        <a href={`mailto:${basics.email}`} target="_blank" rel="noreferrer">
          {basics.email}
        </a>
      ),
    });
  }

  if (basics.phone) {
    contactItems.push({
      key: "phone",
      node: (
        <a href={`tel:${basics.phone}`} target="_blank" rel="noreferrer">
          {basics.phone}
        </a>
      ),
    });
  }

  if (isUrl(basics.url.href)) {
    contactItems.push({
      key: "url",
      node: (
        <a href={basics.url.href} target="_blank" rel="noreferrer noopener nofollow">
          {basics.url.label || basics.url.href}
        </a>
      ),
    });
  }

  basics.customFields.forEach((field) => {
    if (!field.value) return;

    contactItems.push({
      key: field.id,
      node: isUrl(field.value) ? (
        <a href={field.value} target="_blank" rel="noreferrer noopener nofollow">
          {field.name || field.value}
        </a>
      ) : (
        <span>{[field.name, field.value].filter(Boolean).join(": ")}</span>
      ),
    });
  });

  return (
    <div className="space-y-2" style={{ textAlign: "center" }}>
      <div className="text-2xl font-bold">{basics.name}</div>
      {!isEmptyString(basics.headline) && <div className="text-sm">{basics.headline}</div>}

      {contactItems.length > 0 && (
        <div
          className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm"
          style={{ justifyContent: "center" }}
        >
          {contactItems.map((item, index) => (
            <Fragment key={item.key}>
              {index > 0 && <span> | </span>}
              {item.node}
            </Fragment>
          ))}
        </div>
      )}
    </div>
  );
};

const Summary = () => {
  const section = useArtboardStore((state) => state.resume.sections.summary);

  if (!section.visible || isEmptyString(section.content)) return null;

  return (
    <section id={section.id} className="grid">
      <SectionHeading title={section.name} />
      <div
        dangerouslySetInnerHTML={{ __html: sanitize(section.content) }}
        style={{ columns: section.columns }}
        className="wysiwyg"
      />
    </section>
  );
};

type LinkProps = {
  url: URL;
  label?: string;
  className?: string;
};

const Link = ({ url, label, className }: LinkProps) => {
  if (!isUrl(url.href)) return null;

  return (
    <a
      href={url.href}
      target="_blank"
      rel="noreferrer noopener nofollow"
      className={className}
    >
      {label ?? (url.label || url.href)}
    </a>
  );
};

type LinkedEntityProps = {
  name: string;
  url: URL;
  separateLinks: boolean;
  className?: string;
};

const LinkedEntity = ({ name, url, separateLinks, className }: LinkedEntityProps) => {
  return !separateLinks && isUrl(url.href) ? (
    <Link url={url} label={name} className={className} />
  ) : (
    <div className={className}>{name}</div>
  );
};

type SectionProps<T> = {
  section: SectionWithItem<T> | CustomSectionGroup;
  children?: (item: T) => React.ReactNode;
  className?: string;
  urlKey?: keyof T;
  summaryKey?: keyof T;
  keywordsKey?: keyof T;
};

const Section = <T,>({
  section,
  children,
  className,
  urlKey,
  summaryKey,
  keywordsKey,
}: SectionProps<T>) => {
  if (!section.visible || section.items.filter((item) => item.visible).length === 0) return null;

  return (
    <section id={section.id} className="grid">
      <SectionHeading title={section.name} />

      <div
        className="grid gap-x-6 gap-y-3"
        style={{ gridTemplateColumns: `repeat(${section.columns}, 1fr)` }}
      >
        {section.items
          .filter((item) => item.visible)
          .map((item) => {
            const url = (urlKey && get(item, urlKey)) as URL | undefined;
            const summary = (summaryKey && get(item, summaryKey, "")) as string | undefined;
            const keywords = (keywordsKey && get(item, keywordsKey, [])) as string[] | undefined;

            return (
              <div key={item.id} className={className}>
                <div>{children?.(item as T)}</div>

                {url !== undefined && section.separateLinks && <Link url={url} />}

                {summary !== undefined && !isEmptyString(summary) && (
                  <div
                    dangerouslySetInnerHTML={{ __html: sanitize(summary) }}
                    className="wysiwyg"
                  />
                )}

                {keywords !== undefined && keywords.length > 0 && (
                  <p className="text-sm">{keywords.join(", ")}</p>
                )}
              </div>
            );
          })}
      </div>
    </section>
  );
};

const Profiles = () => {
  const section = useArtboardStore((state) => state.resume.sections.profiles);

  return (
    <Section<Profile> section={section}>
      {(item) => (
        <div className="space-y-0.5">
          {isUrl(item.url.href) ? <Link url={item.url} label={item.username} /> : <p>{item.username}</p>}
          {item.network && <p className="text-sm">{item.network}</p>}
        </div>
      )}
    </Section>
  );
};

const Experience = () => {
  const section = useArtboardStore((state) => state.resume.sections.experience);

  return (
    <Section<Experience> section={section} urlKey="url" summaryKey="summary" className="space-y-2">
      {(item) => (
        <div className="flex items-start justify-between">
          <div className="text-left space-y-0.5">
            <LinkedEntity
              name={item.company}
              url={item.url}
              separateLinks={section.separateLinks}
              className="font-bold"
            />
            <div>{item.position}</div>
          </div>

          <div className="shrink-0 text-right space-y-0.5">
            {item.location && <div>{item.location}</div>}
            <div>{item.date}</div>
          </div>
        </div>
      )}
    </Section>
  );
};

const Education = () => {
  const section = useArtboardStore((state) => state.resume.sections.education);

  return (
    <Section<Education> section={section} urlKey="url" summaryKey="summary" className="space-y-2">
      {(item) => {
        const degreeLine = [item.studyType, item.area].filter(Boolean).join(", ");

        return (
          <div className="flex items-start justify-between">
            <div className="text-left space-y-0.5">
              <LinkedEntity
                name={item.institution}
                url={item.url}
                separateLinks={section.separateLinks}
                className="font-bold"
              />
              {degreeLine && <div>{degreeLine}</div>}
              {!isEmptyString(item.score) && <div>{item.score}</div>}
            </div>

            <div className="shrink-0 text-right">
              <div>{item.date}</div>
            </div>
          </div>
        );
      }}
    </Section>
  );
};

const Awards = () => {
  const section = useArtboardStore((state) => state.resume.sections.awards);

  return (
    <Section<Award> section={section} urlKey="url" summaryKey="summary" className="space-y-2">
      {(item) => (
        <div className="flex items-start justify-between">
          <div className="text-left space-y-0.5">
            <div className="font-bold">{item.title}</div>
            <LinkedEntity name={item.awarder} url={item.url} separateLinks={section.separateLinks} />
          </div>

          <div className="shrink-0 text-right">
            <div>{item.date}</div>
          </div>
        </div>
      )}
    </Section>
  );
};

const Certifications = () => {
  const section = useArtboardStore((state) => state.resume.sections.certifications);

  return (
    <Section<Certification>
      section={section}
      urlKey="url"
      summaryKey="summary"
      className="space-y-2"
    >
      {(item) => (
        <div className="flex items-start justify-between">
          <div className="text-left space-y-0.5">
            <div className="font-bold">{item.name}</div>
            <LinkedEntity name={item.issuer} url={item.url} separateLinks={section.separateLinks} />
          </div>

          <div className="shrink-0 text-right">
            <div>{item.date}</div>
          </div>
        </div>
      )}
    </Section>
  );
};

const Skills = () => {
  const section = useArtboardStore((state) => state.resume.sections.skills);
  const items = section.items.filter((item) => item.visible);

  if (!section.visible || items.length === 0) return null;

  const useGrid = section.columns > 1;

  return (
    <section id={section.id} className="grid">
      <SectionHeading title={section.name} />

      <div
        className={useGrid ? "grid gap-x-6 gap-y-3" : "space-y-2"}
        style={useGrid ? { gridTemplateColumns: `repeat(${section.columns}, 1fr)` } : undefined}
      >
        {items.map((item) => {
          const keywords = item.keywords.length > 0 ? item.keywords.join(", ") : "";
          const detail = [item.description, keywords].filter(Boolean).join(" ");

          return (
            <div key={item.id} className="flex items-start gap-x-2">
              <div className="font-bold">{detail ? `${item.name}:` : item.name}</div>
              {detail && <div>{detail}</div>}
            </div>
          );
        })}
      </div>
    </section>
  );
};

const Interests = () => {
  const section = useArtboardStore((state) => state.resume.sections.interests);
  const items = section.items.filter((item) => item.visible);

  if (!section.visible || items.length === 0) return null;

  const values = items.flatMap((item) =>
    item.keywords.length > 0 ? item.keywords : [item.name],
  );

  return (
    <section id={section.id} className="grid">
      <SectionHeading title={section.name} />
      <div>{values.filter(Boolean).join(", ")}</div>
    </section>
  );
};

const Publications = () => {
  const section = useArtboardStore((state) => state.resume.sections.publications);

  return (
    <Section<Publication>
      section={section}
      urlKey="url"
      summaryKey="summary"
      className="space-y-2"
    >
      {(item) => (
        <div className="flex items-start justify-between">
          <div className="text-left space-y-0.5">
            <LinkedEntity
              name={item.name}
              url={item.url}
              separateLinks={section.separateLinks}
              className="font-bold"
            />
            <div>{item.publisher}</div>
          </div>

          <div className="shrink-0 text-right">
            <div>{item.date}</div>
          </div>
        </div>
      )}
    </Section>
  );
};

const Volunteer = () => {
  const section = useArtboardStore((state) => state.resume.sections.volunteer);

  return (
    <Section<Volunteer> section={section} urlKey="url" summaryKey="summary" className="space-y-2">
      {(item) => (
        <div className="flex items-start justify-between">
          <div className="text-left space-y-0.5">
            <LinkedEntity
              name={item.organization}
              url={item.url}
              separateLinks={section.separateLinks}
              className="font-bold"
            />
            <div>{item.position}</div>
          </div>

          <div className="shrink-0 text-right space-y-0.5">
            {item.location && <div>{item.location}</div>}
            <div>{item.date}</div>
          </div>
        </div>
      )}
    </Section>
  );
};

const Languages = () => {
  const section = useArtboardStore((state) => state.resume.sections.languages);

  return (
    <Section<Language> section={section}>
      {(item) => (
        <div className="space-y-0.5">
          <div className="font-bold">{item.name}</div>
          <div>{item.description}</div>
        </div>
      )}
    </Section>
  );
};

const Projects = () => {
  const section = useArtboardStore((state) => state.resume.sections.projects);

  return (
    <Section<Project>
      section={section}
      urlKey="url"
      summaryKey="summary"
      keywordsKey="keywords"
      className="space-y-2"
    >
      {(item) => (
        <div className="flex items-start justify-between">
          <div className="text-left space-y-0.5">
            <LinkedEntity
              name={item.name}
              url={item.url}
              separateLinks={section.separateLinks}
              className="font-bold"
            />
            <div>{item.description}</div>
          </div>

          <div className="shrink-0 text-right">
            <div>{item.date}</div>
          </div>
        </div>
      )}
    </Section>
  );
};

const References = () => {
  const section = useArtboardStore((state) => state.resume.sections.references);

  return (
    <Section<Reference> section={section} urlKey="url" summaryKey="summary">
      {(item) => (
        <div className="space-y-0.5">
          <LinkedEntity
            name={item.name}
            url={item.url}
            separateLinks={section.separateLinks}
            className="font-bold"
          />
          <div>{item.description}</div>
        </div>
      )}
    </Section>
  );
};

const Custom = ({ id }: { id: string }) => {
  const section = useArtboardStore((state) => state.resume.sections.custom[id]);

  return (
    <Section<CustomSection>
      section={section}
      urlKey="url"
      summaryKey="summary"
      keywordsKey="keywords"
      className="space-y-2"
    >
      {(item) => (
        <div className="flex items-start justify-between">
          <div className="text-left space-y-0.5">
            <LinkedEntity
              name={item.name}
              url={item.url}
              separateLinks={section.separateLinks}
              className="font-bold"
            />
            <div>{item.description}</div>
          </div>

          <div className="shrink-0 text-right space-y-0.5">
            {item.location && <div>{item.location}</div>}
            <div>{item.date}</div>
          </div>
        </div>
      )}
    </Section>
  );
};

const mapSectionToComponent = (section: SectionKey) => {
  switch (section) {
    case "profiles": {
      return <Profiles />;
    }
    case "summary": {
      return <Summary />;
    }
    case "experience": {
      return <Experience />;
    }
    case "education": {
      return <Education />;
    }
    case "awards": {
      return <Awards />;
    }
    case "certifications": {
      return <Certifications />;
    }
    case "skills": {
      return <Skills />;
    }
    case "interests": {
      return <Interests />;
    }
    case "publications": {
      return <Publications />;
    }
    case "volunteer": {
      return <Volunteer />;
    }
    case "languages": {
      return <Languages />;
    }
    case "projects": {
      return <Projects />;
    }
    case "references": {
      return <References />;
    }
    default: {
      if (section.startsWith("custom.")) return <Custom id={section.split(".")[1]} />;

      return null;
    }
  }
};

export const Harvard = ({ columns, isFirstPage = false }: TemplateProps) => {
  const [main, sidebar] = columns;

  return (
    <div className="space-y-4 p-custom">
      {isFirstPage && <Header />}

      {main.map((section) => (
        <Fragment key={section}>{mapSectionToComponent(section)}</Fragment>
      ))}

      {sidebar.map((section) => (
        <Fragment key={section}>{mapSectionToComponent(section)}</Fragment>
      ))}
    </div>
  );
};
