# STUDIOJEKER Website

**Visual Content & Marketing for Businesses**

*We Create Visibility. Since 1992.*

---

# Project Overview

This repository contains the complete source code for the Studiojeker website.

The project is built around a design-first, content-first and AI-assisted development workflow.

The goal is not simply to build a website.

The goal is to build a scalable digital platform that reflects the Studiojeker brand and supports future growth.

---

# Project Vision

Studiojeker combines:

- Photography
- Film Production
- Drone
- 3D Visualization
- Visual Content
- Marketing

into one integrated communication platform.

Every technical and design decision should strengthen this positioning.

---

# Core Brand Statement

**Visual Content & Marketing for Businesses**

**We Create Visibility.**

**Since 1992.**

---

# Target Architecture

The Studiojeker website uses a **Next.js frontend** with a **Headless WordPress CMS**.

## Frontend — Next.js

Next.js is responsible for the public website experience:

- public frontend rendering
- visual design and approved brand presentation
- responsive layouts
- navigation
- motion and interactions
- project grids
- case-study presentation
- frontend SEO output
- performance
- accessibility
- DE/EN frontend routing

The approved Studiojeker design is implemented exclusively in the Next.js frontend.

WordPress must **not** control the visual frontend through a WordPress theme or page builder.

## CMS / Content Backend — Headless WordPress

WordPress is the editorial backend for Studiojeker.

It is responsible for editable content, including:

- pages and page content
- projects / case studies
- team members
- services
- competence centers
- customer logos
- testimonials
- "Sichtbarkeit im Abo"
- news / blog content if implemented
- SEO metadata where appropriate
- images and media

Content must be retrieved from WordPress through an API.

Presentation stays in Next.js. Content stays in WordPress.

## Separation of Concerns

| Layer | Responsibility |
| --- | --- |
| Next.js | Rendering, design system, UI, UX, motion, routing, performance, accessibility, frontend SEO |
| Headless WordPress | Structured editorial content, media, SEO metadata fields, publishing workflow |
| Developer Kit | Content, structure, SEO rules, technical and functional requirements |
| DESIGN_SPECIFICATION.md | Visual design, UI, UX, responsive behavior, motion |
| Approved mockups | Visual reference for proportions, imagery and rhythm — not production content |

Never hardcode editable production content in the frontend.

---

# Repository Structure

```text
/
├── docs/
│   ├── STUDIOJEKER_AI_DEVELOPMENT_KIT.md
│   ├── design/mockups/
│   └── sources/
│
├── app/                 # Next.js frontend (to be implemented)
├── components/
├── hooks/
├── lib/                 # includes WordPress API integration
├── public/              # static frontend assets only
├── styles/
│
├── AGENTS.md
├── DESIGN_SPECIFICATION.md
├── README.md
└── package.json
```

WordPress itself is the separate editorial backend. It is not a classic theme-driven frontend in this repository.

---

# Documentation

Before modifying any code, read:

1. AGENTS.md
2. docs/STUDIOJEKER_AI_DEVELOPMENT_KIT.md
3. DESIGN_SPECIFICATION.md
4. approved mockups in docs/design/mockups/
5. relevant documents in docs/sources/

Documentation authority:

- **Developer Kit** — content, information architecture, navigation intent, SEO, CMS models, technical and functional requirements
- **DESIGN_SPECIFICATION.md** — visual design, layout, UI, UX, responsive behavior and motion
- **Approved mockups** — visual reference for proportions, image impact, rhythm and overall feel
- **docs/sources/** — source material for approved copy, SEO titles/metas and brand inputs

Mockup example texts, names, projects, clients, prices or addresses are not production content.

If mockup example content conflicts with the Developer Kit, the Developer Kit wins for content.

---

# Development Principles

Every decision should improve:

- Trust
- Clarity
- Simplicity
- Accessibility
- Performance
- Maintainability
- Long-term scalability

Consistency is more important than novelty.

---

# Design Principles

The website should feel:

- Premium
- Calm
- Swiss
- Minimal
- Professional
- Timeless

Avoid unnecessary visual complexity.

---

# Content Principles

Every page should answer:

- What problem are we solving?
- Why does it matter?
- How does Studiojeker help?
- What should the visitor do next?

Never write filler content.

Every sentence should provide value.

---

# Copywriting Rules

Write clearly.

Write professionally.

Write confidently.

Never exaggerate.

Never invent:

- clients
- testimonials
- awards
- statistics
- project results

---

# Engineering Principles

Prefer:

- reusable components
- simple architecture
- readable code
- accessibility
- performance
- documentation

Avoid unnecessary complexity.

---

# Accessibility

Minimum target:

WCAG AA

Required:

- semantic HTML
- keyboard navigation
- visible focus states
- ARIA where required
- reduced motion support
- alternative text

Accessibility is mandatory.

---

# Performance Targets

Target:

- Lighthouse >95 (where realistic)
- Fast loading
- Optimized media
- Lazy loading
- Responsive images
- Minimal JavaScript

Always optimize without reducing usability.

---

# SEO

Every page should include:

- one H1
- meaningful headings
- metadata
- internal linking
- structured data where appropriate
- optimized images

Content quality is more important than keyword density.

---

# Git Workflow

Use feature branches.

Keep commits small.

Write descriptive commit messages.

Review before merging.

Do not mix unrelated changes.

---

# AI Development Workflow

For every task:

1. Understand the request
2. Read relevant documentation
3. Inspect the existing implementation
4. Create a plan
5. Implement
6. Test
7. Review
8. Document

Never skip planning.

---

# Testing

Before completing work:

- lint
- type check
- build
- responsive verification
- accessibility verification
- manual review

---

# Future Roadmap

Core architecture already includes:

- Next.js frontend + Headless WordPress CMS
- DE/EN content and frontend routing
- case studies / projects
- visibility subscription ("Sichtbarkeit im Abo")
- structured SEO metadata from WordPress, rendered by Next.js

The platform is also designed to support later growth:

- insights / news when implemented
- landing pages and campaign pages
- CRM integration
- newsletter integration
- client portals
- marketing automation
- AI-assisted content workflows

---

# Philosophy

Studiojeker does not create content for the sake of content.

Studiojeker creates visibility.

Technology should never become the focus.

Technology should make communication easier, faster and more valuable.

---

# Final Principle

Every design decision.

Every line of code.

Every animation.

Every piece of content.

Should answer one simple question:

**Does this help create visibility for our clients?**

If the answer is no,

rethink the solution before implementing it.

---

© Studiojeker

Visual Content & Marketing for Businesses

We Create Visibility.
