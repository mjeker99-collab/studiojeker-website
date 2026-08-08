# AGENTS.md
# Studiojeker Website Development Rules

Version 1.0

---

# PROJECT

Studiojeker

Visual Content & Marketing for Businesses

Since 1992

---

# PURPOSE

This repository contains the source code for the Studiojeker website.

Before making any changes, always read:

docs/STUDIOJEKER_AI_DEVELOPMENT_KIT.md

DESIGN_SPECIFICATION.md

Approved mockups in docs/design/mockups/

Documentation authority:

- Developer Kit — content, structure, SEO, CMS and technical requirements
- DESIGN_SPECIFICATION.md — visual design, UI, UX, responsive behavior and motion
- Approved mockups — visual reference only; never production content

If content conflicts exist:

Follow the Development Kit.

If visual conflicts exist between mockups and DESIGN_SPECIFICATION.md:

Follow DESIGN_SPECIFICATION.md, using mockups as proportion and rhythm reference.

Never invent your own design decisions.

Target architecture:

Next.js frontend + Headless WordPress CMS.

WordPress must not control the visual frontend through a theme or page builder.

---

# PRIMARY OBJECTIVE

Build a premium Swiss business website.

Every decision should improve:

• Trust
• Clarity
• Simplicity
• Performance
• Accessibility
• Maintainability

Never optimize one area while damaging another.

---

# BRAND

Studiojeker creates visibility.

Not noise.

Brand personality:

- Premium
- Calm
- Professional
- Swiss
- Timeless
- Business-oriented

Never create flashy or trendy interfaces.

---

# COPYWRITING

Follow the Copywriting Guide.

Rules:

- Short sentences
- Active voice
- Professional tone
- No clichés
- No exaggerated marketing

Never invent:

- clients
- testimonials
- projects
- awards
- statistics

If information is missing:

Leave placeholders or ask.

---

# DESIGN

Always follow the Design System.

Prefer:

Large whitespace

Strong typography

Large imagery

Minimal interface

Clear hierarchy

Avoid visual clutter.

---

# COMPONENTS

Always reuse existing components.

Do not duplicate functionality.

Every component should:

- have one responsibility
- be reusable
- be responsive
- be accessible

---

# RESPONSIVE

Desktop quality.

Mobile-first implementation.

Tablet optimized.

No horizontal scrolling.

Touch-friendly controls.

---

# ACCESSIBILITY

WCAG AA minimum.

Required:

Semantic HTML

Keyboard navigation

Focus states

ARIA labels where appropriate

Alt text

Reduced motion support

Accessibility is never optional.

---

# PERFORMANCE

Prefer:

Server rendering where appropriate

Optimized images

Optimized video

Lazy loading

Code splitting

Minimal JavaScript

Avoid unnecessary dependencies.

---

# SEO

Every page must contain:

One H1

Logical heading hierarchy

Meta title

Meta description

Canonical URL

Structured data when applicable

Meaningful internal links

---

# ANIMATION

Follow the Motion System.

Animations should be:

Subtle

Fast

Purposeful

Never distracting.

Respect:

prefers-reduced-motion

Use reusable motion tokens.

---

# CMS

CMS / content backend:

Headless WordPress

Frontend:

Next.js

Never hardcode editable content in the Next.js frontend.

Prefer reusable WordPress content models.

Retrieve editable content from WordPress through an API.

Keep content independent from presentation.

Follow the HEADLESS WORDPRESS CMS MODEL in the Developer Kit.

---

# ENGINEERING PRINCIPLES

Prefer:

Simple solutions

Readable code

Reusable architecture

Clear naming

Small components

Document non-obvious decisions.

Avoid unnecessary complexity.

---

# BEFORE MODIFYING CODE

Always:

1. Understand the task

2. Read relevant documentation

3. Inspect existing implementation

4. Explain implementation plan

5. List affected files

Only then begin coding.

---

# AFTER MODIFYING CODE

Always provide:

Summary

Files changed

Testing results

Known limitations

Recommended next steps

---

# APPROVAL REQUIRED

Request approval before:

Changing navigation

Changing IA

Changing branding

Changing typography

Changing color system

Adding libraries

Deleting components

Deleting pages

Changing CMS architecture

Changing SEO strategy

Changing animation principles

---

# ALLOWED WITHOUT APPROVAL

Bug fixes

Accessibility improvements

Performance improvements

Code cleanup

Refactoring

Documentation

Responsive fixes

Minor UX improvements

---

# GIT

Small commits.

Logical commits.

Clear commit messages.

One feature per commit.

---

# TESTING

Before completing any task:

Run lint

Run type check

Run tests

Verify build

Verify responsive behavior

Verify accessibility

Never ignore errors.

---

# FILE STRUCTURE

Preferred structure:

docs/
components/
app/
lib/
hooks/
styles/
public/

Keep folders organized.

---

# OUTPUT FORMAT

Every implementation should contain:

Objective

Plan

Files

Implementation Summary

Testing

Open Issues

Recommendations

---

# FINAL PRINCIPLE

When multiple solutions exist:

Choose the simplest.

Choose the clearest.

Choose the most maintainable.

Choose the solution that best reflects the Studiojeker brand.

Do not optimize for novelty.

Optimize for quality.

Protect the Studiojeker brand with every decision.
