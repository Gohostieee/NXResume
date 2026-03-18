import { describe, expect, it } from "vitest";
import {
  compileJobCountQuery,
  compileJobPreviewQuery,
  compileJobRevealQuery,
} from "../compiler";

describe("job search compiler", () => {
  it("maps simple search into the free count payload", () => {
    const result = compileJobCountQuery({
      simpleQuery: "frontend engineer",
      locationText: "New York, NY",
      remoteOnly: true,
      minSalaryUsd: 150000,
      postedWithinDays: 14,
      seniority: ["senior"],
      employmentTypes: ["full_time"],
    });

    expect(result.payload).toMatchObject({
      job_title_or: ["frontend engineer"],
      job_location_pattern_or: ["New York, NY"],
      remote: true,
      min_salary_usd: 150000,
      posted_at_max_age_days: 14,
      job_seniority_or: ["senior"],
      employment_statuses_or: ["full_time"],
      blur_company_data: true,
      include_total_results: true,
      limit: 1,
      page: 0,
    });
  });

  it("defaults the required date guard to 30 days", () => {
    const result = compileJobPreviewQuery({
      simpleQuery: "designer",
    }, 0);

    expect(result.payload.posted_at_max_age_days).toBe(30);
    expect(result.dateGuard.postedAtMaxAgeDays).toBe(30);
  });

  it("builds free preview payloads without total calculation", () => {
    const result = compileJobPreviewQuery(
      {
        simpleQuery: "platform engineer",
        filters: {
          technologies: ["typescript", "react"],
          countries: ["us", "ca"],
          mustHaveFinalUrl: true,
        },
      },
      2,
    );

    expect(result.payload).toMatchObject({
      blur_company_data: true,
      include_total_results: false,
      page: 2,
      limit: 20,
      job_technology_slug_or: ["typescript", "react"],
      job_country_code_or: ["US", "CA"],
      property_exists_and: ["final_url"],
    });
  });

  it("compiles single-job reveal payloads using the original date guard", () => {
    const result = compileJobRevealQuery("1234", {
      queryHash: "abc",
      queryKey: "key",
      dateGuard: {
        postedAtMaxAgeDays: 30,
      },
    });

    expect(result.payload).toMatchObject({
      job_id_or: [1234],
      posted_at_max_age_days: 30,
      blur_company_data: false,
      limit: 1,
    });
  });

  it("rejects exact company identifier filters in v1", () => {
    expect(() =>
      compileJobCountQuery({
        simpleQuery: "engineer",
        filters: {
          company_domain_or: ["example.com"],
        },
      }),
    ).toThrow(/disabled in v1/i);
  });
});
