import "@testing-library/jest-dom/vitest";
import "@/i18n";
import { loadTestCaseLocales } from "@/features/testcase/entry/loadTestCaseLocales";

// The Test case texts are lazy in the app (loaded when the overlay opens); unit tests have them from the start.
await loadTestCaseLocales();
