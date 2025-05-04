import { useNavigate } from "react-router-dom"

// Task type definition
type Task = {
  id: string
  status: "Pending" | "Done"
  action: "Wait" | "Download"
}

function TaskListPage() {
  const navigate = useNavigate()

  // Example task data
  const tasks: Task[] = [
    { id: "T123", status: "Pending", action: "Wait" },
    { id: "T124", status: "Done", action: "Download" },
    { id: "T125", status: "Pending", action: "Wait" }
  ]

  const handleBack = () => {
    navigate("/")
  }

  const handleAction = (task: Task) => {
    if (task.action === "Download") {
      // Handle download logic
      console.log(`Downloading task ${task.id}`)
    }
  }

  return (
    <div className="task-list-page page-container w-full">
      <div className="header">
        <div className="w-full">
          <button
            className="m-0 absolute back-button -translate-x-[18px] -translate-y-[4px]"
            onClick={handleBack}>
            ← Back
          </button>
          <h2 className="text-xl text-center font-bold">Task List</h2>
        </div>
      </div>

      <div className="task-list mt-4">
        <table className="w-full">
          <thead>
            <tr>
              <th>Task ID</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((task) => (
              <tr key={task.id}>
                <td>{task.id}</td>
                <td>
                  <span
                    className={task.status === "Done" ? "active" : "inactive"}>
                    {task.status}
                  </span>
                </td>
                <td>
                  <button
                    className={`action-button ${task.action === "Download" ? "submit-button" : ""}`}
                    onClick={() => handleAction(task)}
                    disabled={task.action === "Wait"}>
                    {task.action}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default TaskListPage
