import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import SignInPage from "@/app/auth/sign-in/page";

describe("SignInPage", () => {
  beforeEach(() => {
    jest.spyOn(global, "fetch").mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: async () => ({ message: "Check your email for a magic link." }),
      }) as unknown as Promise<Response>
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("renders a success message when the request succeeds", async () => {
    render(<SignInPage />);

    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: "user@example.com" },
    });

    fireEvent.submit(screen.getByRole("button", { name: /send magic link/i }));

    await waitFor(() =>
      expect(screen.getByTestId("auth-status")).toHaveTextContent(
        "Check your email for a magic link."
      )
    );
  });

  it("renders an error message when the request fails", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "Unable to sign in." }),
    } as Response);

    render(<SignInPage />);

    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: "fail@example.com" },
    });

    fireEvent.submit(screen.getByRole("button", { name: /send magic link/i }));

    await waitFor(() =>
      expect(screen.getByTestId("auth-status")).toHaveTextContent("Unable to sign in.")
    );
  });
});
