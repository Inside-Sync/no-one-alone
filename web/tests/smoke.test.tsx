import { render, screen } from "@testing-library/react";
import { BrandMark } from "@/components/shell/BrandMark";

test("root layout renders brand", () => {
  render(<BrandMark />);
  expect(screen.getByText("No One Alone")).toBeInTheDocument();
  expect(screen.getByText("by InsideSync")).toBeInTheDocument();
});
