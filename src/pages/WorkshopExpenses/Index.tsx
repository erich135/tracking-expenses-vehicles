import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useNavigate } from "react-router-dom";

type WorkshopJob = {
  id: string;
  job_number: string;
  equipment_detail: string;
  quote_amount: number;
  quote_date: string;
  job_status: string;
  status: string;
  days_quoted: number;
  days_taken: number;
};

export default function WorkshopJobsPage() {
  const [jobs, setJobs] = useState<WorkshopJob[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchJobs();
  }, []);

  async function fetchJobs() {
    const { data, error } = await supabase
      .from("workshop_jobs")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching jobs:", error.message);
    } else {
      setJobs(data);
    }

    setLoading(false);
  }

  function isOverdue(job: WorkshopJob) {
    if (!job.days_quoted || !job.days_taken) return false;
    return job.days_taken > job.days_quoted;
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Workshop Jobs</h1>
        <button
          onClick={() => navigate("/workshop-expenses/add")}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          + Add Workshop Job
        </button>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full table-auto border border-gray-300">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-2 border">Job #</th>
                <th className="px-4 py-2 border">Equipment</th>
                <th className="px-4 py-2 border">Quote (R)</th>
                <th className="px-4 py-2 border">Quote Date</th>
                <th className="px-4 py-2 border">Days Quoted</th>
                <th className="px-4 py-2 border">Days Taken</th>
                <th className="px-4 py-2 border">Status</th>
                <th className="px-4 py-2 border">Job Status</th>
                <th className="px-4 py-2 border">Actions</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <tr key={job.id} className="border-t">
                  <td className="px-4 py-2 border">{job.job_number}</td>
                  <td className="px-4 py-2 border">{job.equipment_detail}</td>
                  <td className="px-4 py-2 border">R {job.quote_amount?.toFixed(2)}</td>
                  <td className="px-4 py-2 border">
                    {job.quote_date ? new Date(job.quote_date).toLocaleDateString() : ""}
                  </td>
                  <td className="px-4 py-2 border">{job.days_quoted}</td>
                  <td className={`px-4 py-2 border ${isOverdue(job) ? "text-red-600 font-bold" : ""}`}>
                    {job.days_taken}
                    {isOverdue(job) && <span className="ml-2">⚠️</span>}
                  </td>
                  <td className="px-4 py-2 border">{job.status}</td>
                  <td className="px-4 py-2 border">{job.job_status}</td>
                  <td className="px-4 py-2 border">
                    <button
                      onClick={() => navigate(`/workshop-expenses/edit/${job.id}`)}
                      className="text-blue-600 underline"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
