import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
type WorkshopJob = {
  id: string;
  job_number: string;
  equipment_detail: string;
  quote_amount: number;
  quote_date: string;
  status: string;
  job_status: string;
};

export default function WorkshopExpenses() {
  const [jobs, setJobs] = useState<WorkshopJob[]>([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Workshop Jobs</h1>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <table className="min-w-full table-auto border border-gray-200">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-2">Job #</th>
              <th className="px-4 py-2">Equipment</th>
              <th className="px-4 py-2">Quote Amount</th>
              <th className="px-4 py-2">Quote Date</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Job Status</th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((job) => (
              <tr key={job.id} className="border-t">
                <td className="px-4 py-2">{job.job_number}</td>
                <td className="px-4 py-2">{job.equipment_detail}</td>
                <td className="px-4 py-2">R {job.quote_amount?.toFixed(2)}</td>
                <td className="px-4 py-2">
                  {job.quote_date ? new Date(job.quote_date).toLocaleDateString() : ""}
                </td>
                <td className="px-4 py-2">{job.status}</td>
                <td className="px-4 py-2">{job.job_status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
