# Browser Automation & E2E Testing with Playwright CLI

## 1. Quick Playwright Commands
Execute end-to-end tests, visual inspections, and UI interaction tests using `playwright-cli` or `npx playwright`:

```bash
# Launch a browser session
playwright-cli open http://localhost:3000

# Navigate to target route
playwright-cli goto http://localhost:3000/dashboard

# Interact with UI elements by ref/selector
playwright-cli click e12
playwright-cli fill e15 "user@domain.com" --submit

# Take visual screenshot for comparison
playwright-cli screenshot --filename test-output/dashboard.png

# Close session
playwright-cli close
```

## 2. Automated Visual & Layout Verification
When validating frontend components or pages:
1. **Responsive Testing**: Test across mobile (390x844), tablet (768x1024), and desktop (1440x900).
2. **Layout Shift Check (CLS)**: Verify that elements do not jump or pop abruptly upon initial render or async data hydration.
3. **Console Log & Error Audit**: Ensure no unhandled exceptions, React key errors, or broken network requests occur during the user flow.
