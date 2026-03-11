import React, { useState } from "react";

const MultiBranchIframeReportPage: React.FC = () => {
  const [reportName, setReportName] = useState("Debtors Report");
  const [branchCodes, setBranchCodes] = useState(""); // Comma-separated branch codes

  // Construct API URL
  const apiUrl = `/api/reports/data-by-branches?report_name=${encodeURIComponent(reportName)}&branch_codes=${encodeURIComponent(branchCodes)}&page=1&page_size=1000`;

  return (
    <div className="w-full h-full flex flex-col items-center justify-center">
      <h2 className="text-xl font-bold mb-4">Multi-Branch Debtors Report Viewer</h2>
      <div className="mb-4 flex gap-4">
        <input
          type="text"
          value={reportName}
          onChange={e => setReportName(e.target.value)}
          placeholder="Report Name"
          className="border px-2 py-1 rounded"
        />
        <input
          type="text"
          value={branchCodes}
          onChange={e => setBranchCodes(e.target.value)}
          placeholder="Branch Codes (e.g. WI+A,SG+B)"
          className="border px-2 py-1 rounded"
        />
      </div>
      <iframe
        src={apiUrl}
        title="Multi-Branch Report Viewer"
        className="w-full h-[80vh] border rounded shadow"
        style={{ minHeight: 500 }}
      />
    </div>
  );
};

export default MultiBranchIframeReportPage;
