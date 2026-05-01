import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { App } from "./App";

describe("Annotated web shell", () => {
  it("renders the p50 feed with source attribution visible", () => {
    render(<App />);

    expect(screen.getByRole("heading", { name: "Following feed" })).toBeInTheDocument();
    expect(screen.getAllByText("youtube.com")[0]).toBeInTheDocument();
    expect(screen.getAllByText("File a claim")[0]).toBeInTheDocument();
  });

  it("keeps the p95 claim workflow explicit as a notice flow", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getAllByText("File a claim")[0]);

    expect(screen.getByRole("dialog", { name: "File a claim" })).toBeInTheDocument();
    expect(screen.getByText(/does not decide fair use automatically/i)).toBeInTheDocument();
  });
});
