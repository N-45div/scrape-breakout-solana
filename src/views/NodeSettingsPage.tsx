import { useState } from "react"
import { useNavigate } from "react-router-dom"

function NodeSettingsPage() {
  const navigate = useNavigate()
  const [bandwidth, setBandwidth] = useState(50)
  const [sliderValue, setSliderValue] = useState(50)

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSliderValue(parseInt(e.target.value))
  }

  const handleSaveChanges = () => {
    setBandwidth(sliderValue)
    // navigate('/')
  }

  const handleCancel = () => {
    navigate("/")
  }

  return (
    <div className="page-container w-full">
      <div className="header text-center mb-4">
        <h2 className="text-xl font-bold">Node Settings</h2>
      </div>

      <div className="settings-content">
        <div className="setting-item mb-6">
          <div className="setting-label mb-2">
            Bandwidth: {bandwidth} MB/hour
          </div>

          <div className="slider-container">
            <input
              type="range"
              min="1"
              max="100"
              value={sliderValue}
              onChange={handleSliderChange}
              className="w-full"
            />
            <div className="slider-labels flex justify-between text-sm text-gray-500">
              <span>1 MB</span>
              <span>100 MB</span>
            </div>
          </div>
        </div>

        <div className="form-actions flex justify-center gap-4 mt-8">
          <button
            className="save-button bg-blue-500 text-white"
            onClick={handleSaveChanges}>
            Save Changes
          </button>
          <button className="cancel-button" onClick={handleCancel}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

export default NodeSettingsPage
