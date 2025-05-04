import { useState } from "react"
import { useNavigate } from "react-router-dom"

function CreateTasksPage() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    url: "https://example.com",
    params: '{"selector": ".price"}',
    filter: "Positive Sentiment",
    label: "Sentiment: Pos/Neg",
    format: "JSONL"
  })

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Process form submission logic
    navigate("/")
  }

  const handleCancel = () => {
    navigate("/")
  }

  return (
    <div className="page-container w-full">
      <div className="header flex justify-center mb-4">
        <h2 className="text-xl font-bold">Create Tasks</h2>
      </div>

      <form onSubmit={handleSubmit} className="task-form">
        <div className="form-group mb-4">
          <label className="block mb-1">URL:</label>
          <input
            type="text"
            name="url"
            value={formData.url}
            onChange={handleChange}
            className="w-full p-2 border rounded"
          />
        </div>

        <div className="form-group mb-4">
          <label className="block mb-1">Params:</label>
          <input
            type="text"
            name="params"
            value={formData.params}
            onChange={handleChange}
            className="w-full p-2 border rounded"
          />
        </div>

        <div className="form-group mb-4">
          <label className="block mb-1">Filter:</label>
          <input
            type="text"
            name="filter"
            value={formData.filter}
            onChange={handleChange}
            className="w-full p-2 border rounded"
          />
        </div>

        <div className="form-group mb-4">
          <label className="block mb-1">Label:</label>
          <input
            type="text"
            name="label"
            value={formData.label}
            onChange={handleChange}
            className="w-full p-2 border rounded"
          />
        </div>

        <div className="form-group mb-4">
          <label className="block mb-1">Format:</label>
          <input
            type="text"
            name="format"
            value={formData.format}
            onChange={handleChange}
            className="w-full p-2 border rounded"
          />
        </div>

        <div className="form-actions flex justify-center gap-4">
          <button
            type="submit"
            className="submit-button bg-blue-500 text-white">
            Submit Task
          </button>
          <button
            type="button"
            className="cancel-button"
            onClick={handleCancel}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}

export default CreateTasksPage
