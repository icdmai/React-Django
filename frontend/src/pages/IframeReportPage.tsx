import React from "react";

// Utility to get query params from URL
function useQuery() {
  return new URLSearchParams(window.location.search);
}

const IframeReportPage: React.FC = () => {
  const query = useQuery();

  const branch = query.get("branch") || "";
  const fieldname = query.get("fieldname") || "";

  // Construct the report URL with branch and fieldname if present
  let reportUrl = "/report-viewer";
  const params = [];
  if (branch) params.push(`branch=${encodeURIComponent(branch)}`);
  if (fieldname) params.push(`fieldname=${encodeURIComponent(fieldname)}`);
  if (params.length > 0) {
    reportUrl += `?${params.join("&")}`;
  }

  return (
    <div className="w-full h-full flex flex-col items-center justify-center">
      <h2 className="text-xl font-bold mb-4">
        Report Viewer (Branch: {branch || "N/A"}, Fieldname: {fieldname || "N/A"})
      </h2>
      <iframe
        src={reportUrl}
        title="Report Viewer"
        className="w-full h-[80vh] border rounded shadow"
        style={{ minHeight: 500 }}
      />
    </div>
  );
};

export default IframeReportPage;
