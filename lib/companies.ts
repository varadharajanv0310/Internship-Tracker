/**
 * Companies whose careers page gets crawled by `npm run discover` to find
 * their real ATS board. Adding a company here is a one-line change — the
 * discovery step works out which ATS they use and what the token is.
 *
 * Kept separate from TIER1_COMPANIES (lib/profile.ts) because that list is
 * the fixed priority set; this one is the wider India net.
 */
export interface DiscoverTarget {
  name: string;
  careersUrl: string;
}

export const DISCOVER_TARGETS: DiscoverTarget[] = [
  // ---- Indian product companies / unicorns
  { name: "Razorpay", careersUrl: "https://razorpay.com/jobs/" },
  { name: "Zomato", careersUrl: "https://www.zomato.com/careers" },
  { name: "Swiggy", careersUrl: "https://careers.swiggy.com/" },
  { name: "Meesho", careersUrl: "https://www.meesho.io/jobs" },
  { name: "CRED", careersUrl: "https://careers.cred.club/" },
  { name: "Groww", careersUrl: "https://groww.in/careers" },
  { name: "Zerodha", careersUrl: "https://zerodha.com/careers/" },
  { name: "PhonePe", careersUrl: "https://www.phonepe.com/careers/" },
  { name: "Flipkart", careersUrl: "https://www.flipkartcareers.com/" },
  { name: "Nykaa", careersUrl: "https://www.nykaa.com/careers" },
  { name: "Dream11", careersUrl: "https://dreamsports.group/careers/" },
  { name: "Zepto", careersUrl: "https://www.zeptonow.com/careers" },
  { name: "Urban Company", careersUrl: "https://www.urbancompany.com/careers" },
  { name: "Jupiter", careersUrl: "https://jupiter.money/careers/" },
  { name: "Setu", careersUrl: "https://setu.co/careers" },
  { name: "Juspay", careersUrl: "https://juspay.io/careers" },
  { name: "Slice", careersUrl: "https://www.sliceit.com/careers" },
  { name: "Navi", careersUrl: "https://navi.com/careers" },
  { name: "smallcase", careersUrl: "https://www.smallcase.com/careers" },
  { name: "Chargebee", careersUrl: "https://www.chargebee.com/careers/" },

  // ---- Indian SaaS / dev tools
  { name: "Postman", careersUrl: "https://www.postman.com/company/careers/" },
  { name: "BrowserStack", careersUrl: "https://www.browserstack.com/careers" },
  { name: "Hasura", careersUrl: "https://hasura.io/careers/" },
  { name: "Freshworks", careersUrl: "https://www.freshworks.com/company/careers/" },
  { name: "Zoho", careersUrl: "https://www.zoho.com/careers/" },
  { name: "Sprinklr", careersUrl: "https://www.sprinklr.com/careers/" },
  { name: "Innovaccer", careersUrl: "https://innovaccer.com/careers" },
  { name: "Whatfix", careersUrl: "https://whatfix.com/careers/" },
  { name: "CleverTap", careersUrl: "https://clevertap.com/careers/" },
  { name: "MoEngage", careersUrl: "https://www.moengage.com/careers/" },
  { name: "Darwinbox", careersUrl: "https://darwinbox.com/careers" },
  { name: "Zeta", careersUrl: "https://www.zeta.tech/careers/" },
  { name: "Icertis", careersUrl: "https://www.icertis.com/company/careers/" },
  { name: "Mindtickle", careersUrl: "https://www.mindtickle.com/careers/" },

  // ---- AI / ML labs and startups hiring in India
  { name: "Sarvam AI", careersUrl: "https://www.sarvam.ai/careers" },
  { name: "Krutrim", careersUrl: "https://www.olakrutrim.com/careers" },
  { name: "Observe.AI", careersUrl: "https://www.observe.ai/careers" },
  { name: "Fractal", careersUrl: "https://fractal.ai/careers/" },
  { name: "Tiger Analytics", careersUrl: "https://www.tigeranalytics.com/careers/" },
  { name: "Wadhwani AI", careersUrl: "https://www.wadhwaniai.org/careers/" },
  { name: "Glance", careersUrl: "https://glance.com/careers" },
  { name: "Uniphore", careersUrl: "https://www.uniphore.com/careers/" },

  // ---- Global companies with large India engineering centres
  { name: "Databricks", careersUrl: "https://www.databricks.com/company/careers/open-positions" },
  { name: "Atlassian", careersUrl: "https://www.atlassian.com/company/careers/all-jobs" },
  { name: "Stripe", careersUrl: "https://stripe.com/jobs/search" },
  { name: "Rubrik", careersUrl: "https://www.rubrik.com/company/careers" },
  { name: "Nutanix", careersUrl: "https://www.nutanix.com/company/careers" },
  { name: "Arcesium", careersUrl: "https://www.arcesium.com/careers" },
  { name: "Media.net", careersUrl: "https://www.media.net/careers" },
  { name: "Twilio", careersUrl: "https://www.twilio.com/en-us/company/jobs" },
  { name: "Confluent", careersUrl: "https://www.confluent.io/careers/" },
  { name: "MongoDB", careersUrl: "https://www.mongodb.com/careers" },
  { name: "Snowflake", careersUrl: "https://careers.snowflake.com/us/en" },
  { name: "ServiceNow", careersUrl: "https://careers.servicenow.com/careers/" },
  { name: "Qualcomm", careersUrl: "https://careers.qualcomm.com/careers" },
  { name: "Cisco", careersUrl: "https://jobs.cisco.com/jobs/SearchJobs" },
  { name: "IBM", careersUrl: "https://www.ibm.com/careers/search" },
  { name: "SAP", careersUrl: "https://jobs.sap.com/" },
  { name: "Uber", careersUrl: "https://www.uber.com/us/en/careers/list/" },
  { name: "Wells Fargo", careersUrl: "https://www.wellsfargojobs.com/en/jobs/" },
  { name: "Goldman Sachs", careersUrl: "https://higher.gs.com/roles" },
  { name: "Apple", careersUrl: "https://jobs.apple.com/en-in/search" },
  { name: "Google", careersUrl: "https://www.google.com/about/careers/applications/jobs/results/" },

  // ---- Quant / trading desks in India
  { name: "Quadeye", careersUrl: "https://www.quadeye.com/careers" },
  { name: "Graviton", careersUrl: "https://www.gravitontrading.com/careers.html" },
  { name: "AlphaGrep", careersUrl: "https://www.alpha-grep.com/careers" },
  { name: "Tower Research", careersUrl: "https://www.tower-research.com/open-positions/" },
  { name: "Optiver", careersUrl: "https://optiver.com/working-at-optiver/career-opportunities/" },
  { name: "IMC", careersUrl: "https://careers.imc.com/us/en/search-results" },
  { name: "Da Vinci Derivatives", careersUrl: "https://www.davincitrading.com/careers/" },
  { name: "WorldQuant", careersUrl: "https://www.worldquant.com/careers/" },

  // ---- Chennai-local employers
  { name: "Kaleris", careersUrl: "https://www.kaleris.com/careers/" },
  { name: "Planys Technologies", careersUrl: "https://planystech.com/careers/" },
  { name: "Ather Energy", careersUrl: "https://www.atherenergy.com/careers" },
  { name: "Hyperverge", careersUrl: "https://hyperverge.co/careers/" },
  { name: "Vuram", careersUrl: "https://www.vuram.com/careers/" },
  { name: "Indium Software", careersUrl: "https://www.indiumsoftware.com/careers/" },
];
