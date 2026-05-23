import type { MDXComponents } from "mdx/types";

/**
 * MDX component overrides — applied to every MDX file in the project.
 *
 * We hand-style the prose so blog posts inherit the "Jailbroken
 * Terminal" aesthetic instead of falling back to browser defaults.
 * Everything is utility-class only; no Tailwind plugins required.
 */
export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    h1: ({ children }) => (
      <h1 className="mb-4 mt-12 font-display text-4xl uppercase tracking-tight text-void-900 first:mt-0 sm:text-5xl">
        {children}
      </h1>
    ),
    h2: ({ children }) => (
      <h2 className="mb-3 mt-10 font-display text-2xl uppercase tracking-tight text-void-900 sm:text-3xl">
        {children}
      </h2>
    ),
    h3: ({ children }) => (
      <h3 className="mb-2 mt-8 font-display text-xl uppercase tracking-tight text-void-900">
        {children}
      </h3>
    ),
    p: ({ children }) => (
      <p className="mb-4 text-[15px] leading-relaxed text-void-800">{children}</p>
    ),
    ul: ({ children }) => (
      <ul className="mb-4 list-disc space-y-1.5 pl-6 text-[15px] leading-relaxed text-void-800 marker:text-signal-cyan">
        {children}
      </ul>
    ),
    ol: ({ children }) => (
      <ol className="mb-4 list-decimal space-y-1.5 pl-6 text-[15px] leading-relaxed text-void-800 marker:text-signal-cyan marker:font-mono">
        {children}
      </ol>
    ),
    li: ({ children }) => <li className="pl-1">{children}</li>,
    a: ({ children, href }) => (
      <a
        href={href}
        className="text-signal-cyan underline decoration-signal-cyan/40 underline-offset-4 transition hover:decoration-signal-cyan"
      >
        {children}
      </a>
    ),
    blockquote: ({ children }) => (
      <blockquote className="my-6 border-l-2 border-signal-violet/60 bg-signal-violet/[0.04] py-3 pl-5 pr-4 font-serif text-[18px] italic leading-relaxed text-void-900">
        {children}
      </blockquote>
    ),
    code: ({ children }) => (
      <code className="border border-void-300/70 bg-void-100/40 px-1.5 py-0.5 font-mono text-[12px] text-signal-cyan">
        {children}
      </code>
    ),
    hr: () => <hr className="my-10 border-0 border-t border-void-300/70" />,
    strong: ({ children }) => (
      <strong className="font-bold text-void-900">{children}</strong>
    ),
    em: ({ children }) => <em className="font-serif italic">{children}</em>,
    ...components,
  };
}
