# T.E.A.R.S. Character Creator & Companion

## Functional & Technical Specification for Implementation

# Project Goal

Create a mobile-first Progressive Web App (PWA) for the T.E.A.R.S. Pen & Paper RPG.

The application has two major modes:

1. Character Creation
2. Gameplay Companion

The application should work completely offline after the first load.

No server backend is required initially.

Character data should be stored locally in browser storage.

---

# Technical Requirements

## Architecture

* Mobile-first design
* Responsive layout
* Progressive Web App (PWA)
* Offline capable
* Installable on Android and iOS
* Local storage only
* No account required
* No internet connection required after installation

Recommended stack:

* React
* TypeScript
* Vite
* TailwindCSS
* Zustand
* LocalStorage or IndexedDB

---

# Main Navigation

The application consists of three main sections:

## Characters

Character management.

Functions:

* Create character
* Edit character
* Delete character
* Duplicate character
* Export character
* Import character

---

## Character Sheet

Read-only character overview.

Displays:

* Character information
* Attributes
* Talents
* Specifications
* Derived values
* Special abilities

---

## Gameplay

Gameplay assistant.

Functions:

* Talent checks
* Attribute checks
* Combat calculations
* Initiative display
* Life tracking
* Mental health tracking

---

# UX Principles

## Rule Visibility

Rules should not be exposed directly.

Instead:

* Show remaining points
* Highlight invalid choices
* Calculate everything automatically

The user should never need a calculator.

---

## Color Coding

Attribute colors:

* KK → Red
* GE → Blue
* AU → Green
* CH → Pink
* IN → Purple
* MB → Orange

Talent category colors:

* Physical → Red
* Motoric → Blue
* Mental → Purple
* Social → Yellow
* Combat → Dark Red

The same colors should be used throughout the application.

---

## Point Allocation UX

Each attribute should be adjustable via:

* and - buttons

Example:

KK 13 [-] [+]
GE 15 [-] [+]

Display:

Remaining Attribute Points: 7

Cost increases should be visualized automatically.

Example:

14 → 15 costs 2 points

18 → 19 costs 3 points

---

# Character Creation Flow

Step 1

Character Information

Fields:

* Name
* Gender
* Age
* Height
* Profession Name

---

Step 2

Profession Category

Select one category.

Available categories:

* Physical
* Handcraft
* Customer Contact
* Creative
* Thinking
* Military
* Medical
* Student/Unemployed

Automatically applies starting attributes and talent budgets.

---

Step 3

Attributes

Base:

All attributes start at 8.

Apply profession category modifiers.

Distribute 14 attribute points.

Maximum value:

19

Cost table:

9-14 = 1

15-17 = 2

18-19 = 3

Display derived values live.

---

Step 4

Talents

Talents grouped by category.

Accordion layout recommended.

Each talent:

* Name
* Current value
* Related attributes

Example:

Lockpicking
GE / GE / IN

[-] 4 [+]

Combat talents:

* Cost multiplier = 2

Display remaining talent points per category.

---

Step 5

Required Profession Specification

Choose one negative specification.

Requirements:

* Must fit profession.
* Validation left to player/game master.

No automatic enforcement.

---

Step 6

Hobbies

Up to two hobbies.

Hobby 1:

* +5 points to matching talent
* one negative specification from same category
* specification modifier ignored

Hobby 2:

* +3 points to matching talent

---

Step 7

Free Specifications

Choose:

* one positive specification
* one negative specification

Apply modifiers automatically.

Positive modifier value:

negative specification

Negative modifier value:

positive specification

---

Step 8

Special Abilities

Purchase using free talent points.

Known abilities:

Car License = 3

Car + Motorcycle = 5

Sailing License = 12

Small Aircraft = 12

Special License = 25

---

Step 9

Character Overview

Display complete character sheet.

Export options:

* JSON
* PDF (future)

---

# Attributes

KK = Körperkraft

GE = Geschicklichkeit

AU = Ausdauer

CH = Charme

IN = Intelligenz

MB = Mentale Belastbarkeit

All start at 8.

---

# Profession Categories

Physical:
KK 13
AU 11

Handcraft:
GE 13
KK 11

Customer Contact:
CH 13
GE 11

Creative:
MB 13
IN 11

Thinking:
IN 13
MB 11

Military:
AU 12
GE 12

Medical:
GE 13
IN 11

Student:
AU 11
CH 11
IN 9
GE 9

---

# Talent Categories

Physical

Motoric

Mental

Social

Combat

---

# Talent Data Model

Talent

* name
* category
* costMultiplier
* attribute1
* attribute2
* attribute3

Combat talents:

costMultiplier = 2

attribute references = null

Normal talents:

costMultiplier = 1

---

# Derived Values

ATN = (KK + KK + GE) / 3

PA = (KK + AU + GE) / 3

ATD = (GE + GE + AU) / 3

INI = (KK + 5) - (GE / 2)

LE = (KK + KK + AU) * 3

GG = (AU + IN + MB + MB) * 3

---

# Gameplay Mode

## Goal

The player should not need to know the calculation rules.

The application calculates everything.

---

## Talent Check Flow

Example:

Lockpicking

Related attributes:

GE / GE / IN

Character:

GE = 14

GE = 14

IN = 12

Talent Value = 5

The app shows:

Roll 1 (GE):
[Enter value]

Roll 2 (GE):
[Enter value]

Roll 3 (IN):
[Enter value]

Alternative:

[Roll Automatically]

---

## Check Resolution

For each roll:

roll <= attribute

Success

roll > attribute

Difference is calculated.

Example:

Roll = 17

Attribute = 14

Difference = 3

Difference must be paid from talent points.

Talent pool is reduced by accumulated differences.

If total difference <= talent value:

Success

Remaining talent points determine quality.

If total difference > talent value:

Failure

---

# Future Features

* Combat workflow
* Initiative tracker
* Weapon database
* Inventory
* Group management
* Session mode
* PDF export
* Character sharing
* Cloud synchronization
