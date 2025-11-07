import { motion } from 'framer-motion';
import { Calendar, Clock, User, Stethoscope, Check, X, UserPlus, Plus, History, Trash2, RefreshCw, FileText, Users, ClipboardList } from 'lucide-react';
import { useState, useEffect } from 'react';

const API_URL = 'http://localhost:8000/api/appointments';

const AppointmentScheduling = () => {
  const [doctors, setDoctors] = useState([]);
  const [patients, setPatients] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [doctorSchedule, setDoctorSchedule] = useState(null);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [bookedSlots, setBookedSlots] = useState({});
  const [selectedTime, setSelectedTime] = useState(null);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [showAddDoctor, setShowAddDoctor] = useState(false);
  const [showAddPatient, setShowAddPatient] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showDoctorSchedule, setShowDoctorSchedule] = useState(false);
  const [showAllPatients, setShowAllPatients] = useState(false);
  const [showAllDoctors, setShowAllDoctors] = useState(false);
  const [patientHistory, setPatientHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  // New doctor form
  const [newDoctor, setNewDoctor] = useState({
    name: '',
    speciality: 'General Medicine',
    start_time: 9,
    end_time: 17
  });

  // New patient form
  const [newPatient, setNewPatient] = useState({
    name: '',
    age: '',
    contact: ''
  });

  useEffect(() => {
    fetchDoctors();
    fetchPatients();
  }, []);

  useEffect(() => {
    if (selectedDoctor) {
      fetchDoctorSchedule(selectedDoctor.doctor_id);
    }
  }, [selectedDoctor]);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchDoctors = async () => {
    try {
      const response = await fetch(`${API_URL}/doctors`);
      const data = await response.json();
      setDoctors(data);
    } catch (error) {
      showToast('Failed to fetch doctors', 'error');
    }
  };

  const fetchPatients = async () => {
    try {
      const response = await fetch(`${API_URL}/patients`);
      const data = await response.json();
      setPatients(data);
    } catch (error) {
      showToast('Failed to fetch patients', 'error');
    }
  };

  const fetchDoctorSchedule = async (doctorId) => {
    try {
      const response = await fetch(`${API_URL}/doctors/${doctorId}/schedule`);
      const data = await response.json();
      setDoctorSchedule(data);
      setAvailableSlots(data.available_slots);
      setBookedSlots(data.booked_slots);
    } catch (error) {
      showToast('Failed to fetch schedule', 'error');
    }
  };

  const handleRefresh = () => {
    fetchDoctors();
    fetchPatients();
    if (selectedDoctor) {
      fetchDoctorSchedule(selectedDoctor.doctor_id);
    }
    showToast('Data refreshed!');
  };

  const handleAddDoctor = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/doctors`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newDoctor)
      });
      
      if (response.ok) {
        showToast('Doctor added successfully!');
        setShowAddDoctor(false);
        setNewDoctor({ name: '', speciality: 'General Medicine', start_time: 9, end_time: 17 });
        fetchDoctors();
      }
    } catch (error) {
      showToast('Failed to add doctor', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAddPatient = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/patients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPatient)
      });
      
      if (response.ok) {
        showToast('Patient registered successfully!');
        setShowAddPatient(false);
        setNewPatient({ name: '', age: '', contact: '' });
        fetchPatients();
      }
    } catch (error) {
      showToast('Failed to register patient', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleBookAppointment = async () => {
    if (!selectedDoctor || !selectedPatient || selectedTime === null) {
      showToast('Please select doctor, patient, and time slot', 'error');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          doctor_id: selectedDoctor.doctor_id,
          patient_id: selectedPatient.patient_id,
          time: selectedTime
        })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        showToast(data.message);
        setSelectedTime(null);
        fetchDoctorSchedule(selectedDoctor.doctor_id);
      } else {
        showToast(data.detail || 'Booking failed', 'error');
      }
    } catch (error) {
      showToast('Failed to book appointment', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleViewHistory = async (patientId) => {
    try {
      const response = await fetch(`${API_URL}/patients/${patientId}/history`);
      const data = await response.json();
      setPatientHistory(data.history);
      setShowHistory(true);
    } catch (error) {
      showToast('Failed to fetch patient history', 'error');
    }
  };

  const specialties = ['Cardiologist', 'Neurologist', 'Pediatrician', 'Orthopedic', 'Dermatologist', 'General Physician'];
  const getRandomSpecialty = () => specialties[Math.floor(Math.random() * specialties.length)];

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-blue-50 to-indigo-50 py-8">
      {/* Toast Notification */}
      {toast && (
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg ${
            toast.type === 'success' ? 'bg-success' : 'bg-danger'
          } text-white`}
        >
          {toast.message}
        </motion.div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-4xl font-bold text-textPrimary mb-2">🩺 Doctor Appointment Scheduling</h1>
              <p className="text-textSecondary">Complete hospital appointment management system</p>
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleRefresh}
              className="bg-purple-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-purple-600"
            >
              <RefreshCw size={20} /> Refresh All
            </motion.button>
          </div>
          
          {/* Action Buttons Row */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowAddDoctor(true)}
              className="bg-primary text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 hover:bg-blue-700"
            >
              <Plus size={18} /> Add Doctor
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowAddPatient(true)}
              className="bg-success text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 hover:bg-green-600"
            >
              <UserPlus size={18} /> Add Patient
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowAllDoctors(true)}
              className="bg-indigo-500 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 hover:bg-indigo-600"
            >
              <Stethoscope size={18} /> Doctor Records
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowAllPatients(true)}
              className="bg-teal-500 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 hover:bg-teal-600"
            >
              <Users size={18} /> Patient Records
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => selectedDoctor && setShowDoctorSchedule(true)}
              disabled={!selectedDoctor}
              className="bg-orange-500 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Clock size={18} /> View Schedule
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => selectedPatient && handleViewHistory(selectedPatient.patient_id)}
              disabled={!selectedPatient}
              className="bg-pink-500 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 hover:bg-pink-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FileText size={18} /> Patient History
            </motion.button>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Doctors List */}
          <div className="lg:col-span-1">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-xl shadow-lg p-6"
            >
              <h2 className="text-xl font-bold text-textPrimary mb-4 flex items-center">
                <Stethoscope className="mr-2" />
                Available Doctors ({doctors.length})
              </h2>
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {doctors.map((doctor, index) => (
                  <motion.div
                    key={doctor.doctor_id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 + index * 0.05 }}
                    onClick={() => setSelectedDoctor(doctor)}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      selectedDoctor?.doctor_id === doctor.doctor_id
                        ? 'border-primary bg-blue-50'
                        : 'border-gray-200 hover:border-primary'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="text-4xl">👨‍⚕️</div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-textPrimary">{doctor.name}</h3>
                        <p className="text-sm text-textSecondary">{doctor.speciality || 'General Medicine'}</p>
                        <span className="text-xs px-2 py-1 rounded-full mt-1 inline-block bg-success text-white">
                          Available
                        </span>
                      </div>
                    </div>
                  </motion.div>
                ))}
                {doctors.length === 0 && (
                  <p className="text-center text-textSecondary py-8">No doctors registered yet</p>
                )}
              </div>
            </motion.div>
          </div>

          {/* Booking Section */}
          <div className="lg:col-span-2 space-y-6">
            {/* Patient Selection */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-white rounded-xl shadow-lg p-6"
            >
              <h2 className="text-xl font-bold text-textPrimary mb-4 flex items-center">
                <User className="mr-2" />
                Select Patient
              </h2>
              <select
                value={selectedPatient?.patient_id || ''}
                onChange={(e) => {
                  const patient = patients.find(p => p.patient_id === e.target.value);
                  setSelectedPatient(patient);
                }}
                className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
              >
                <option value="">Choose a patient...</option>
                {patients.map(patient => (
                  <option key={patient.patient_id} value={patient.patient_id}>
                    {patient.name} - Age: {patient.age} - Contact: {patient.contact}
                  </option>
                ))}
              </select>
              
              {selectedPatient && (
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  onClick={() => handleViewHistory(selectedPatient.patient_id)}
                  className="mt-3 text-primary hover:text-blue-700 flex items-center gap-2"
                >
                  <History size={16} /> View Patient History
                </motion.button>
              )}
            </motion.div>

            {/* Time Slots */}
            {selectedDoctor && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="bg-white rounded-xl shadow-lg p-6"
              >
                <h2 className="text-xl font-bold text-textPrimary mb-4 flex items-center justify-between">
                  <span className="flex items-center">
                    <Clock className="mr-2" />
                    Time Slots for {selectedDoctor.name}
                  </span>
                  <span className="text-sm font-normal text-textSecondary">
                    {availableSlots.length} available / {Object.keys(bookedSlots).length} booked
                  </span>
                </h2>
                
                {/* Available Slots */}
                {availableSlots.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-sm font-semibold text-success mb-2">✅ Available Slots</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
                      {availableSlots.map((time, index) => {
                        const isSelected = selectedTime === time;
                        return (
                          <motion.button
                            key={time}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.6 + index * 0.02 }}
                            onClick={() => setSelectedTime(time)}
                            className={`px-4 py-3 rounded-lg font-semibold transition-all ${
                              isSelected
                                ? 'bg-primary text-white shadow-lg scale-105'
                                : 'bg-green-50 text-success border-2 border-success hover:bg-success hover:text-white'
                            }`}
                          >
                            {time}:00
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Booked Slots */}
                {Object.keys(bookedSlots).length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-danger mb-2">🔒 Booked Slots</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {Object.entries(bookedSlots).map(([time, patientId]) => {
                        const patient = patients.find(p => p.patient_id === patientId);
                        return (
                          <div
                            key={time}
                            className="px-4 py-3 bg-red-50 border-2 border-danger rounded-lg"
                          >
                            <div className="flex justify-between items-center">
                              <div>
                                <span className="font-semibold text-danger">{time}:00</span>
                                <p className="text-sm text-textSecondary">
                                  Patient: <span className="font-semibold">{patient?.name || 'Unknown'}</span>
                                </p>
                                {patient && (
                                  <p className="text-xs text-textSecondary">
                                    Age: {patient.age} | Contact: {patient.contact}
                                  </p>
                                )}
                              </div>
                              <X className="text-danger" size={20} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {availableSlots.length === 0 && Object.keys(bookedSlots).length === 0 && (
                  <p className="text-center text-textSecondary py-8">No slots configured for this doctor</p>
                )}

                {selectedTime !== null && selectedPatient && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-6 p-4 bg-blue-50 rounded-lg"
                  >
                    <h3 className="font-semibold text-textPrimary mb-2">Booking Summary:</h3>
                    <div className="space-y-1 text-textSecondary">
                      <p>Doctor: <span className="font-semibold text-textPrimary">{selectedDoctor.name}</span></p>
                      <p className="text-xs">Speciality: <span className="font-semibold">{selectedDoctor.speciality || 'General Medicine'}</span></p>
                      <p>Patient: <span className="font-semibold text-textPrimary">{selectedPatient.name}</span></p>
                      <p>Time: <span className="font-semibold text-textPrimary">{selectedTime}:00</span></p>
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleBookAppointment}
                      disabled={loading}
                      className="w-full mt-4 bg-success hover:bg-green-600 text-white px-6 py-3 rounded-lg font-semibold transition-colors flex items-center justify-center disabled:opacity-50"
                    >
                      <Check className="mr-2" />
                      {loading ? 'Booking...' : 'Confirm Appointment'}
                    </motion.button>
                  </motion.div>
                )}
              </motion.div>
            )}

            {/* Quick Stats */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="bg-white rounded-xl shadow-lg p-6"
            >
              <h2 className="text-xl font-bold text-textPrimary mb-4 flex items-center">
                <ClipboardList className="mr-2" />
                System Overview
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-textSecondary">Total Doctors</p>
                  <p className="text-3xl font-bold text-primary">{doctors.length}</p>
                </div>
                <div className="p-4 bg-green-50 rounded-lg">
                  <p className="text-sm text-textSecondary">Total Patients</p>
                  <p className="text-3xl font-bold text-success">{patients.length}</p>
                </div>
                <div className="p-4 bg-orange-50 rounded-lg">
                  <p className="text-sm text-textSecondary">Available Slots</p>
                  <p className="text-3xl font-bold text-orange-500">
                    {selectedDoctor ? availableSlots.length : '-'}
                  </p>
                </div>
                <div className="p-4 bg-red-50 rounded-lg">
                  <p className="text-sm text-textSecondary">Booked Slots</p>
                  <p className="text-3xl font-bold text-danger">
                    {selectedDoctor ? Object.keys(bookedSlots).length : '-'}
                  </p>
                </div>
              </div>
              
              {selectedDoctor && (
                <div className="mt-4 p-4 bg-purple-50 rounded-lg">
                  <p className="text-sm text-textSecondary">Selected Doctor</p>
                  <p className="text-lg font-semibold text-purple-600">{selectedDoctor.name}</p>
                  <p className="text-xs text-textSecondary">{selectedDoctor.speciality || 'General Medicine'}</p>
                </div>
              )}
              
              {selectedPatient && (
                <div className="mt-2 p-4 bg-pink-50 rounded-lg">
                  <p className="text-sm text-textSecondary">Selected Patient</p>
                  <p className="text-lg font-semibold text-pink-600">{selectedPatient.name}</p>
                  <p className="text-xs text-textSecondary">Age: {selectedPatient.age} | Visits: {selectedPatient.history.length}</p>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </div>

      {/* Add Doctor Modal */}
      {showAddDoctor && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowAddDoctor(false)}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-xl p-6 max-w-md w-full"
          >
            <h2 className="text-2xl font-bold text-textPrimary mb-4">Add New Doctor</h2>
            <form onSubmit={handleAddDoctor} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-textPrimary mb-2">Doctor Name</label>
                <input
                  type="text"
                  value={newDoctor.name}
                  onChange={(e) => setNewDoctor({...newDoctor, name: e.target.value})}
                  className="w-full px-4 py-2 rounded-lg border-2 border-gray-200 focus:border-primary"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-textPrimary mb-2">Speciality</label>
                <select
                  value={newDoctor.speciality}
                  onChange={(e) => setNewDoctor({...newDoctor, speciality: e.target.value})}
                  className="w-full px-4 py-2 rounded-lg border-2 border-gray-200 focus:border-primary"
                  required
                >
                  <option value="General Medicine">General Medicine</option>
                  <option value="Cardiology">Cardiology</option>
                  <option value="Orthopedics">Orthopedics</option>
                  <option value="Pediatrics">Pediatrics</option>
                  <option value="Neurology">Neurology</option>
                  <option value="Dermatology">Dermatology</option>
                  <option value="ENT">ENT</option>
                  <option value="Ophthalmology">Ophthalmology</option>
                  <option value="Gynecology">Gynecology</option>
                  <option value="Psychiatry">Psychiatry</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-textPrimary mb-2">Start Time (Hour)</label>
                <input
                  type="number"
                  min="0"
                  max="23"
                  value={newDoctor.start_time}
                  onChange={(e) => setNewDoctor({...newDoctor, start_time: parseInt(e.target.value)})}
                  className="w-full px-4 py-2 rounded-lg border-2 border-gray-200 focus:border-primary"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-textPrimary mb-2">End Time (Hour)</label>
                <input
                  type="number"
                  min="0"
                  max="23"
                  value={newDoctor.end_time}
                  onChange={(e) => setNewDoctor({...newDoctor, end_time: parseInt(e.target.value)})}
                  className="w-full px-4 py-2 rounded-lg border-2 border-gray-200 focus:border-primary"
                  required
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-primary text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Adding...' : 'Add Doctor'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddDoctor(false)}
                  className="flex-1 bg-gray-200 text-textPrimary px-4 py-2 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}

      {/* Add Patient Modal */}
      {showAddPatient && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowAddPatient(false)}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-xl p-6 max-w-md w-full"
          >
            <h2 className="text-2xl font-bold text-textPrimary mb-4">Register New Patient</h2>
            <form onSubmit={handleAddPatient} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-textPrimary mb-2">Patient Name</label>
                <input
                  type="text"
                  value={newPatient.name}
                  onChange={(e) => setNewPatient({...newPatient, name: e.target.value})}
                  className="w-full px-4 py-2 rounded-lg border-2 border-gray-200 focus:border-primary"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-textPrimary mb-2">Age</label>
                <input
                  type="number"
                  min="0"
                  max="150"
                  value={newPatient.age}
                  onChange={(e) => setNewPatient({...newPatient, age: e.target.value})}
                  className="w-full px-4 py-2 rounded-lg border-2 border-gray-200 focus:border-primary"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-textPrimary mb-2">Contact Number</label>
                <input
                  type="tel"
                  value={newPatient.contact}
                  onChange={(e) => setNewPatient({...newPatient, contact: e.target.value})}
                  className="w-full px-4 py-2 rounded-lg border-2 border-gray-200 focus:border-primary"
                  required
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-success text-white px-4 py-2 rounded-lg hover:bg-green-600 disabled:opacity-50"
                >
                  {loading ? 'Registering...' : 'Register Patient'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddPatient(false)}
                  className="flex-1 bg-gray-200 text-textPrimary px-4 py-2 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}

      {/* Patient History Modal */}
      {showHistory && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowHistory(false)}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto"
          >
            <h2 className="text-2xl font-bold text-textPrimary mb-4">📜 Patient Visit History</h2>
            {patientHistory.length > 0 ? (
              <div className="space-y-3">
                {patientHistory.map((visit, index) => (
                  <div key={index} className="p-4 bg-blue-50 rounded-lg border-l-4 border-primary">
                    <div className="grid grid-cols-2 gap-2">
                      <p><strong>Doctor:</strong> {visit.Doctor}</p>
                      <p><strong>Time:</strong> {visit.Time}:00</p>
                      <p><strong>Date:</strong> {visit.Date || 'N/A'}</p>
                      <p className="col-span-2"><strong>Medicine:</strong> {visit.Medicine}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-textSecondary py-8">No visit history found</p>
            )}
            <button
              onClick={() => setShowHistory(false)}
              className="mt-4 w-full bg-primary text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              Close
            </button>
          </motion.div>
        </motion.div>
      )}

      {/* Doctor Schedule Modal */}
      {showDoctorSchedule && selectedDoctor && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowDoctorSchedule(false)}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-xl p-6 max-w-3xl w-full max-h-[80vh] overflow-y-auto"
          >
            <h2 className="text-2xl font-bold text-textPrimary mb-2">🗓️ Doctor Schedule</h2>
            <p className="text-lg text-textSecondary mb-1">Dr. {selectedDoctor.name}</p>
            <p className="text-sm text-textSecondary mb-4">{selectedDoctor.speciality || 'General Medicine'}</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Available Slots */}
              <div className="p-4 bg-green-50 rounded-lg">
                <h3 className="font-semibold text-success mb-3 flex items-center gap-2">
                  <Check size={20} /> Available Slots ({availableSlots.length})
                </h3>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {availableSlots.map(time => (
                    <div key={time} className="px-3 py-2 bg-white rounded border border-success text-success font-semibold">
                      {time}:00 - Free
                    </div>
                  ))}
                  {availableSlots.length === 0 && (
                    <p className="text-sm text-textSecondary text-center py-4">No available slots</p>
                  )}
                </div>
              </div>

              {/* Booked Slots */}
              <div className="p-4 bg-red-50 rounded-lg">
                <h3 className="font-semibold text-danger mb-3 flex items-center gap-2">
                  <X size={20} /> Booked Slots ({Object.keys(bookedSlots).length})
                </h3>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {Object.entries(bookedSlots).map(([time, patientId]) => {
                    const patient = patients.find(p => p.patient_id === patientId);
                    return (
                      <div key={time} className="px-3 py-2 bg-white rounded border border-danger">
                        <p className="font-semibold text-danger">{time}:00</p>
                        <p className="text-sm text-textSecondary">Patient: {patient?.name || 'Unknown'}</p>
                      </div>
                    );
                  })}
                  {Object.keys(bookedSlots).length === 0 && (
                    <p className="text-sm text-textSecondary text-center py-4">No booked slots</p>
                  )}
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowDoctorSchedule(false)}
              className="mt-4 w-full bg-primary text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              Close
            </button>
          </motion.div>
        </motion.div>
      )}

      {/* All Patients Modal */}
      {showAllPatients && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowAllPatients(false)}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-xl p-6 max-w-4xl w-full max-h-[80vh] overflow-y-auto"
          >
            <h2 className="text-2xl font-bold text-textPrimary mb-4">👥 All Patient Records ({patients.length})</h2>
            
            {patients.length > 0 ? (
              <div className="space-y-3">
                {patients.map((patient, index) => (
                  <motion.div
                    key={patient.patient_id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="p-4 bg-blue-50 rounded-lg border-l-4 border-primary"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="bg-primary text-white w-10 h-10 rounded-full flex items-center justify-center font-bold">
                            {patient.patient_id}
                          </div>
                          <div>
                            <h3 className="font-semibold text-textPrimary text-lg">{patient.name}</h3>
                            <p className="text-sm text-textSecondary">Patient ID: {patient.patient_id}</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-sm">
                          <p><strong>Age:</strong> {patient.age}</p>
                          <p><strong>Contact:</strong> {patient.contact}</p>
                          <p><strong>Total Visits:</strong> {patient.history.length}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setShowAllPatients(false);
                          handleViewHistory(patient.patient_id);
                        }}
                        className="ml-4 px-3 py-2 bg-primary text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                      >
                        <History size={16} /> History
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <p className="text-center text-textSecondary py-8">No patients registered yet</p>
            )}

            <button
              onClick={() => setShowAllPatients(false)}
              className="mt-4 w-full bg-primary text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              Close
            </button>
          </motion.div>
        </motion.div>
      )}

      {/* All Doctors Modal */}
      {showAllDoctors && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowAllDoctors(false)}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-xl p-6 max-w-4xl w-full max-h-[80vh] overflow-y-auto"
          >
            <h2 className="text-2xl font-bold text-textPrimary mb-4">👨‍⚕️ All Doctor Records ({doctors.length})</h2>
            
            {doctors.length > 0 ? (
              <div className="space-y-3">
                {doctors.map((doctor, index) => {
                  const slots = doctor.slots || {};
                  const totalSlots = Object.keys(slots).length;
                  const bookedCount = Object.values(slots).filter(v => v !== null).length;
                  const availableCount = totalSlots - bookedCount;
                  
                  return (
                    <motion.div
                      key={doctor.doctor_id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="p-4 bg-indigo-50 rounded-lg border-l-4 border-indigo-500"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="bg-indigo-500 text-white w-10 h-10 rounded-full flex items-center justify-center font-bold">
                              {doctor.doctor_id}
                            </div>
                            <div>
                              <h3 className="font-semibold text-textPrimary text-lg">{doctor.name}</h3>
                              <p className="text-sm text-textSecondary">{doctor.speciality || 'General Medicine'}</p>
                              <p className="text-xs text-textSecondary">Doctor ID: {doctor.doctor_id}</p>
                            </div>
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-sm">
                            <p className="text-success"><strong>Available:</strong> {availableCount}</p>
                            <p className="text-danger"><strong>Booked:</strong> {bookedCount}</p>
                            <p className="text-textSecondary"><strong>Total Slots:</strong> {totalSlots}</p>
                          </div>
                          
                          {/* Show slot times */}
                          <div className="mt-2 flex flex-wrap gap-1">
                            {Object.entries(slots).map(([time, patientId]) => (
                              <span
                                key={time}
                                className={`text-xs px-2 py-1 rounded ${
                                  patientId === null
                                    ? 'bg-green-100 text-success'
                                    : 'bg-red-100 text-danger'
                                }`}
                              >
                                {time}:00 {patientId !== null && `(P-${patientId})`}
                              </span>
                            ))}
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            setSelectedDoctor(doctor);
                            fetchDoctorSchedule(doctor.doctor_id);
                            setShowAllDoctors(false);
                            setShowDoctorSchedule(true);
                          }}
                          className="ml-4 px-3 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 flex items-center gap-2"
                        >
                          <Clock size={16} /> Schedule
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <p className="text-center text-textSecondary py-8">No doctors registered yet</p>
            )}

            <button
              onClick={() => setShowAllDoctors(false)}
              className="mt-4 w-full bg-primary text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              Close
            </button>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
};

export default AppointmentScheduling;
