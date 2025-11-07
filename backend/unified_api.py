from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional, Dict
import heapq
import time
from datetime import datetime
import json
import os

app = FastAPI(
    title="Hospital Management System API",
    version="4.0.0",
    description="Unified API for Emergency Triage, Hospital Navigation, Doctor Appointments, and Pharmacy Management"
)

# Enable CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==================== EMERGENCY TRIAGE MODULE ====================

# Severity classification dictionary
severity_map = {
    # CRITICAL (Life-threatening)
    "heart attack": 1,
    "stroke": 1,
    "breathing difficulty": 1,
    "severe accident": 1,
    "cardiac arrest": 1,
    "unconscious": 1,
    "severe bleeding": 1,
    "seizure": 1,
    "anaphylaxis": 1,
    "burns (severe)": 1,

    # SERIOUS (Requires urgent but not immediate life support)
    "fracture": 2,
    "high fever": 2,
    "severe pain": 2,
    "severe infection": 2,
    "chest pain": 2,
    "deep wound": 2,
    "dehydration": 2,
    "burns (moderate)": 2,

    # MODERATE (Needs attention, but stable condition)
    "food poisoning": 3,
    "minor injury": 3,
    "asthma": 3,
    "vomiting": 3,
    "diarrhea": 3,
    "sprain": 3,
    "skin rash": 3,
    "ear pain": 3,
    "burns (mild)": 3,

    # NORMAL (General OPD, not emergency)
    "headache": 4,
    "cold": 4,
    "cough": 4,
    "sore throat": 4,
    "toothache": 4,
    "allergy (mild)": 4,
    "body ache": 4,
    "fatigue": 4,
    "insomnia": 4
}

# Doctor pool
doctors = [
    "Dr. Smith", "Dr. Johnson", "Dr. Williams", "Dr. Davis", 
    "Dr. Miller", "Dr. Anderson", "Dr. Thomas", "Dr. Garcia",
    "Dr. Martinez", "Dr. Rodriguez"
]

# Global queue and counter for Emergency Triage
patient_queue = []
arrival_counter = [0]
patient_start_times = {}
patient_doctors = {}

# Pydantic models for Emergency Triage
class PatientInput(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    age: int = Field(..., ge=0, le=150)
    symptom: str = Field(..., min_length=1)

class PatientResponse(BaseModel):
    id: int
    name: str
    age: int
    severity: str
    symptom: str
    waitTime: str
    doctor: str
    queuePosition: int

class StatsResponse(BaseModel):
    Critical: int
    Serious: int
    Moderate: int
    Normal: int

class MessageResponse(BaseModel):
    message: str
    patient: dict

class SymptomInfo(BaseModel):
    name: str
    severity: str

# Helper functions for Emergency Triage
def get_severity_label(priority: int) -> str:
    labels = {1: "Critical", 2: "Serious", 3: "Moderate", 4: "Normal"}
    return labels.get(priority, "Normal")

def format_time_ago(start_time):
    elapsed = int(time.time() - start_time)
    if elapsed < 60:
        return f"{elapsed} sec ago"
    elif elapsed < 3600:
        minutes = elapsed // 60
        return f"{minutes} min ago"
    else:
        hours = elapsed // 3600
        return f"{hours} hr ago"

def get_waiting_minutes(start_time):
    return int((time.time() - start_time) / 60)

def assign_doctor(priority: int) -> str:
    """Assign doctor based on severity"""
    if priority == 1:  # Critical
        return doctors[0]
    elif priority == 2:  # Serious
        index = arrival_counter[0] % 3
        return doctors[1 + index]
    elif priority == 3:  # Moderate
        index = arrival_counter[0] % 3
        return doctors[4 + index]
    else:  # Normal
        index = arrival_counter[0] % 3
        return doctors[7 + index]

# ==================== HOSPITAL NAVIGATION MODULE ====================

# Hospital graph from Hospital_Graph_DSA.py
hospital_graph = {}

# Pydantic models for Navigation
class Location(BaseModel):
    id: str
    name: str
    icon: str

class PathRequest(BaseModel):
    start: str
    end: str

class PathResponse(BaseModel):
    distance: float
    path: List[str]
    pathNames: List[str]
    valid: bool
    estimatedTime: int

# Graph building functions
def add_vertex(graph, vertex):
    if vertex not in graph:
        graph[vertex] = []

def add_edge(graph, vertex1, vertex2, distance):
    if vertex1 in graph and vertex2 in graph:
        graph[vertex1].append((vertex2, distance))
        graph[vertex2].append((vertex1, distance))

def dijkstra(graph, start_node, end_node):
    """Dijkstra's shortest path algorithm from Hospital_Graph_DSA.py"""
    distances = {node: float('inf') for node in graph}
    distances[start_node] = 0
    
    priority_queue = [(0, start_node)]
    previous_nodes = {}
    
    while priority_queue:
        current_distance, current_node = heapq.heappop(priority_queue)
        
        if current_distance > distances[current_node]:
            continue
        
        if current_node == end_node:
            break
        
        for neighbor, weight in graph.get(current_node, []):
            distance = current_distance + weight
            
            if distance < distances[neighbor]:
                distances[neighbor] = distance
                previous_nodes[neighbor] = current_node
                heapq.heappush(priority_queue, (distance, neighbor))
    
    # Reconstruct path
    path = []
    current = end_node
    
    if distances[current] == float('inf'):
        return None, []
    
    while current in previous_nodes:
        path.insert(0, current)
        current = previous_nodes[current]
    
    if path:
        path.insert(0, start_node)
    
    return distances[end_node], path

# Location metadata
location_data = {
    "PKG": {"name": "Parking Garage", "icon": "🅿️"},
    "ME": {"name": "Main Entrance", "icon": "🚪"},
    "ER": {"name": "Emergency Room", "icon": "🚑"},
    "OPC": {"name": "Outpatient Clinic", "icon": "🏥"},
    "RAD": {"name": "Radiology", "icon": "🩻"},
    "LAB": {"name": "Laboratory", "icon": "🧪"},
    "SUR": {"name": "Surgical Center", "icon": "🔬"},
    "IWA": {"name": "Inpatient Ward A", "icon": "🛏️"},
    "IWB": {"name": "Inpatient Ward B", "icon": "🏨"},
    "PHR": {"name": "Pharmacy", "icon": "💊"},
    "CAF": {"name": "Cafeteria", "icon": "🍽️"}
}

# Initialize hospital graph
def initialize_graph():
    """Initialize the hospital graph with all locations and connections"""
    global hospital_graph
    hospital_graph = {}
    
    locations = ["PKG", "ME", "ER", "OPC", "RAD", "LAB", "SUR", "IWA", "IWB", "PHR", "CAF"]
    
    for loc in locations:
        add_vertex(hospital_graph, loc)
    
    edges = [
        ("PKG", "ME", 100),
        ("ME", "OPC", 120),
        ("ME", "CAF", 50),
        ("ME", "IWA", 150),
        ("ER", "RAD", 60),
        ("ER", "SUR", 90),
        ("OPC", "LAB", 70),
        ("OPC", "PHR", 80),
        ("RAD", "LAB", 40),
        ("RAD", "IWA", 110),
        ("RAD", "IWB", 130),
        ("LAB", "PHR", 50),
        ("IWA", "IWB", 80),
        ("IWA", "SUR", 100),
        ("IWB", "SUR", 70),
        ("CAF", "IWA", 140)
    ]
    
    for loc1, loc2, dist in edges:
        add_edge(hospital_graph, loc1, loc2, dist)

# Initialize graph on module load
initialize_graph()

# ==================== DOCTOR APPOINTMENT MODULE ====================

# File paths for Appointments
APPOINTMENTS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "Doctor_Appointment&Registry")
os.makedirs(APPOINTMENTS_DIR, exist_ok=True)
PATIENTS_FILE = os.path.join(APPOINTMENTS_DIR, "Patients.json")
DOCTORS_FILE = os.path.join(APPOINTMENTS_DIR, "Doctors.json")

# File paths for Pharmacy
PHARMACY_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "Inventory_Management")
os.makedirs(PHARMACY_DIR, exist_ok=True)
MEDICINE_FILE = os.path.join(PHARMACY_DIR, "medicine.json")
PATIENT_BILLING_FILE = os.path.join(PHARMACY_DIR, "patient.json")

# Initialize JSON files if they don't exist
def init_json_files():
    if not os.path.exists(PATIENTS_FILE):
        with open(PATIENTS_FILE, 'w') as f:
            json.dump({}, f)
    if not os.path.exists(DOCTORS_FILE):
        with open(DOCTORS_FILE, 'w') as f:
            json.dump({}, f)

init_json_files()

# Load data
def load_patients():
    try:
        with open(PATIENTS_FILE, 'r') as f:
            return json.load(f)
    except:
        return {}

def load_doctors():
    try:
        with open(DOCTORS_FILE, 'r') as f:
            return json.load(f)
    except:
        return {}

def save_patients(patients):
    with open(PATIENTS_FILE, 'w') as f:
        json.dump(patients, f, indent=3)

def save_doctors(doctors_data):
    with open(DOCTORS_FILE, 'w') as f:
        json.dump(doctors_data, f, indent=3)

# Pydantic models for Appointments
class PatientCreate(BaseModel):
    name: str
    age: int
    contact: str

class DoctorCreate(BaseModel):
    name: str
    speciality: str
    start_time: int = Field(..., ge=0, le=23)
    end_time: int = Field(..., ge=0, le=23)

class AppointmentBook(BaseModel):
    doctor_id: str
    patient_id: str
    time: int = Field(..., ge=0, le=23)

class DoctorVisit(BaseModel):
    doctor_id: str
    time: int
    medicine: str

class PatientRecord(BaseModel):
    patient_id: str
    name: str
    age: int
    contact: str
    history: List[Dict]

class DoctorRecord(BaseModel):
    doctor_id: str
    name: str
    speciality: str
    slots: Dict[str, Optional[str]]

class AppointmentResponse(BaseModel):
    message: str
    available_slots: Optional[List[int]] = None
    appointment: Optional[Dict] = None

# ==================== PHARMACY MODULE ====================

# Initialize pharmacy JSON files
def init_pharmacy_files():
    if not os.path.exists(MEDICINE_FILE):
        with open(MEDICINE_FILE, 'w') as f:
            json.dump({}, f)
    if not os.path.exists(PATIENT_BILLING_FILE):
        with open(PATIENT_BILLING_FILE, 'w') as f:
            json.dump({}, f)

init_pharmacy_files()

# Pharmacy helper functions
def load_medicines():
    try:
        with open(MEDICINE_FILE, 'r') as f:
            return json.load(f)
    except:
        return {}

def save_medicines(data):
    with open(MEDICINE_FILE, 'w') as f:
        json.dump(data, f, indent=4)

def load_patient_billing():
    try:
        with open(PATIENT_BILLING_FILE, 'r') as f:
            return json.load(f)
    except:
        return {}

def save_patient_billing(data):
    with open(PATIENT_BILLING_FILE, 'w') as f:
        json.dump(data, f, indent=4)

# Pydantic models for Pharmacy
class MedicineSerial(BaseModel):
    name: str
    serial: str
    expiry: str
    price: float

class BillingRequest(BaseModel):
    patient_name: str
    medicine_name: str

class MedicineInfo(BaseModel):
    name: str
    stock: int
    serials: Dict[str, Dict]

class PatientBilling(BaseModel):
    patient_name: str
    purchases: List[Dict]
    frequency: Dict[str, int]
    total_price: float

# ==================== API ENDPOINTS ====================

# ROOT
@app.get("/", tags=["Root"])
def root():
    return {
        "message": "🏥 Hospital Management System API",
        "version": "4.0.0",
        "status": "operational",
        "modules": {
            "emergency_triage": "/api/emergency/*",
            "navigation": "/api/navigation/*",
            "appointments": "/api/appointments/*",
            "pharmacy": "/api/pharmacy/*"
        },
        "statistics": {
            "patients_in_queue": len(patient_queue),
            "hospital_locations": len(hospital_graph),
            "registered_patients": len(load_patients()),
            "registered_doctors": len(load_doctors()),
            "medicine_types": len(load_medicines())
        },
        "docs": "/docs"
    }

@app.get("/api/health", tags=["Health"])
def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "services": {
            "emergency_triage": {
                "active": True,
                "queue_size": len(patient_queue),
                "total_arrivals": arrival_counter[0]
            },
            "navigation": {
                "active": True,
                "locations": len(hospital_graph),
                "graph_loaded": len(hospital_graph) > 0
            },
            "appointments": {
                "active": True,
                "total_patients": len(load_patients()),
                "total_doctors": len(load_doctors())
            },
            "pharmacy": {
                "active": True,
                "medicine_types": len(load_medicines()),
                "total_stock": sum(med.get('stock', 0) for med in load_medicines().values())
            }
        }
    }

# ==================== EMERGENCY TRIAGE ENDPOINTS ====================

@app.get("/api/emergency/patients", response_model=List[PatientResponse], tags=["Emergency Triage"])
def get_patients():
    """Get all patients in emergency queue"""
    sorted_queue = sorted(patient_queue)
    patients_list = []
    
    for idx, (priority, arrival, patient) in enumerate(sorted_queue):
        time_str = format_time_ago(patient_start_times.get(arrival, time.time()))
        
        patients_list.append(PatientResponse(
            id=arrival,
            name=patient['name'],
            age=patient['age'],
            severity=get_severity_label(priority),
            symptom=patient['symptom'].title(),
            waitTime=time_str,
            doctor=patient_doctors.get(arrival, "Unassigned"),
            queuePosition=idx + 1
        ))
    
    return patients_list

@app.post("/api/emergency/patients", response_model=MessageResponse, status_code=201, tags=["Emergency Triage"])
def add_patient(patient_input: PatientInput):
    """Add new patient to emergency queue"""
    symptom_lower = patient_input.symptom.lower().strip()
    
    if symptom_lower not in severity_map:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown symptom '{patient_input.symptom}'. Please select a valid symptom."
        )
    
    priority = severity_map[symptom_lower]
    arrival_counter[0] += 1
    arrival = arrival_counter[0]
    
    patient = {
        "name": patient_input.name,
        "age": patient_input.age,
        "symptom": symptom_lower
    }
    
    patient_start_times[arrival] = time.time()
    doctor = assign_doctor(priority)
    patient_doctors[arrival] = doctor
    
    heapq.heappush(patient_queue, (priority, arrival, patient))
    
    return MessageResponse(
        message=f"Patient '{patient['name']}' registered successfully",
        patient={
            "name": patient['name'],
            "age": patient['age'],
            "severity": get_severity_label(priority),
            "condition": symptom_lower.title(),
            "doctor": doctor,
            "queuePosition": len(patient_queue)
        }
    )

@app.post("/api/emergency/patients/treat", response_model=MessageResponse, tags=["Emergency Triage"])
def treat_patient():
    """Treat next patient in queue"""
    if not patient_queue:
        raise HTTPException(status_code=400, detail="No patients in queue")
    
    priority, arrival, patient = heapq.heappop(patient_queue)
    
    wait_time = get_waiting_minutes(patient_start_times.get(arrival, time.time()))
    doctor = patient_doctors.get(arrival, "Unknown")
    
    if arrival in patient_start_times:
        del patient_start_times[arrival]
    if arrival in patient_doctors:
        del patient_doctors[arrival]
    
    return MessageResponse(
        message=f"Patient '{patient['name']}' is being treated",
        patient={
            "name": patient['name'],
            "severity": get_severity_label(priority),
            "doctor": doctor,
            "waitedMinutes": wait_time,
            "remaining": len(patient_queue)
        }
    )

@app.get("/api/emergency/stats", response_model=StatsResponse, tags=["Emergency Triage"])
def get_stats():
    """Get patient statistics by severity"""
    stats = {'Critical': 0, 'Serious': 0, 'Moderate': 0, 'Normal': 0}
    
    for priority, _, _ in patient_queue:
        stats[get_severity_label(priority)] += 1
    
    return StatsResponse(**stats)

@app.get("/api/emergency/symptoms", response_model=List[SymptomInfo], tags=["Emergency Triage"])
def get_symptoms():
    """Get all available symptoms with severity levels"""
    symptoms = []
    for symptom, priority in severity_map.items():
        symptoms.append(SymptomInfo(
            name=symptom.title(),
            severity=get_severity_label(priority)
        ))
    return sorted(symptoms, key=lambda x: (severity_map[x.name.lower()], x.name))

@app.delete("/api/emergency/patients/clear", tags=["Emergency Triage"])
def clear_emergency_queue():
    """Clear all patients from emergency queue"""
    count = len(patient_queue)
    patient_queue.clear()
    patient_start_times.clear()
    patient_doctors.clear()
    arrival_counter[0] = 0
    return {"message": "Emergency queue cleared successfully", "patientsCleared": count}

# ==================== NAVIGATION ENDPOINTS ====================

@app.get("/api/navigation/locations", response_model=List[Location], tags=["Navigation"])
def get_locations():
    """Get all hospital locations"""
    locations = []
    for loc_id, data in location_data.items():
        locations.append(Location(
            id=loc_id,
            name=data["name"],
            icon=data["icon"]
        ))
    return sorted(locations, key=lambda x: x.name)

@app.post("/api/navigation/path", response_model=PathResponse, tags=["Navigation"])
def find_path(request: PathRequest):
    """Find shortest path using Dijkstra's algorithm"""
    start = request.start.strip().upper()
    end = request.end.strip().upper()
    
    if start not in hospital_graph:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid start location: {start}"
        )
    
    if end not in hospital_graph:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid end location: {end}"
        )
    
    if start == end:
        return PathResponse(
            distance=0,
            path=[start],
            pathNames=[location_data[start]["name"]],
            valid=True,
            estimatedTime=0
        )
    
    total_distance, path = dijkstra(hospital_graph, start, end)
    
    if total_distance is None or not path:
        return PathResponse(
            distance=0,
            path=[],
            pathNames=[],
            valid=False,
            estimatedTime=0
        )
    
    path_names = [location_data[loc]["name"] for loc in path]
    estimated_time = max(1, round(total_distance / 80))  # 80 meters/minute
    
    return PathResponse(
        distance=round(total_distance, 2),
        path=path,
        pathNames=path_names,
        valid=True,
        estimatedTime=estimated_time
    )

# ==================== APPOINTMENTS ENDPOINTS ====================

@app.get("/api/appointments/patients", response_model=List[PatientRecord], tags=["Appointments"])
def get_all_patients():
    """Get all registered patients"""
    patients = load_patients()
    result = []
    for pid, pdata in patients.items():
        result.append(PatientRecord(
            patient_id=pid,
            name=pdata['name'],
            age=pdata['age'],
            contact=pdata['contact'],
            history=pdata.get('history', [])
        ))
    return result

@app.post("/api/appointments/patients", status_code=201, tags=["Appointments"])
def add_appointment_patient(patient: PatientCreate):
    """Add new patient to registry"""
    patients = load_patients()
    patient_id = str(len(patients) + 1)
    
    patients[patient_id] = {
        "name": patient.name,
        "age": patient.age,
        "contact": patient.contact,
        "history": []
    }
    
    save_patients(patients)
    
    return {
        "message": f"Patient added successfully",
        "patient_id": patient_id,
        "patient": patients[patient_id]
    }

@app.get("/api/appointments/patients/{patient_id}/history", tags=["Appointments"])
def get_patient_history(patient_id: str):
    """Get patient's appointment history"""
    patients = load_patients()
    
    if patient_id not in patients:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    return {
        "patient_id": patient_id,
        "name": patients[patient_id]['name'],
        "history": patients[patient_id].get('history', [])
    }

@app.get("/api/appointments/doctors", response_model=List[DoctorRecord], tags=["Appointments"])
def get_all_doctors():
    """Get all doctors and their schedules"""
    doctors_data = load_doctors()
    result = []
    for did, ddata in doctors_data.items():
        result.append(DoctorRecord(
            doctor_id=did,
            name=ddata['name'],
            speciality=ddata.get('speciality', 'General'),
            slots=ddata['slots']
        ))
    return result

@app.post("/api/appointments/doctors", status_code=201, tags=["Appointments"])
def add_doctor(doctor: DoctorCreate):
    """Add new doctor with available time slots"""
    if doctor.start_time >= doctor.end_time:
        raise HTTPException(
            status_code=400,
            detail="End time must be after start time"
        )
    
    doctors_data = load_doctors()
    doctor_id = str(len(doctors_data) + 1)
    
    doctors_data[doctor_id] = {
        "name": doctor.name,
        "speciality": doctor.speciality,
        "slots": {str(t): None for t in range(doctor.start_time, doctor.end_time)}
    }
    
    save_doctors(doctors_data)
    
    return {
        "message": f"Doctor added successfully",
        "doctor_id": doctor_id,
        "doctor": doctors_data[doctor_id]
    }

@app.get("/api/appointments/doctors/{doctor_id}/schedule", tags=["Appointments"])
def get_doctor_schedule(doctor_id: str):
    """Get doctor's schedule with available/booked slots"""
    doctors_data = load_doctors()
    
    if doctor_id not in doctors_data:
        raise HTTPException(status_code=404, detail="Doctor not found")
    
    doctor = doctors_data[doctor_id]
    available_slots = [int(t) for t, pid in doctor['slots'].items() if pid is None]
    booked_slots = {int(t): pid for t, pid in doctor['slots'].items() if pid is not None}
    
    return {
        "doctor_id": doctor_id,
        "name": doctor['name'],
        "speciality": doctor.get('speciality', 'General'),
        "available_slots": sorted(available_slots),
        "booked_slots": booked_slots,
        "total_slots": len(doctor['slots'])
    }

@app.post("/api/appointments/book", response_model=AppointmentResponse, tags=["Appointments"])
def book_appointment(appointment: AppointmentBook):
    """Book an appointment for a patient with a doctor"""
    doctors_data = load_doctors()
    patients = load_patients()
    
    if appointment.doctor_id not in doctors_data:
        raise HTTPException(status_code=404, detail="Doctor not found")
    
    if appointment.patient_id not in patients:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    doctor = doctors_data[appointment.doctor_id]
    time_str = str(appointment.time)
    
    if time_str not in doctor['slots']:
        raise HTTPException(
            status_code=400,
            detail=f"Time slot {appointment.time}:00 not available for this doctor"
        )
    
    if doctor['slots'][time_str] is not None:
        raise HTTPException(
            status_code=400,
            detail=f"Slot {appointment.time}:00 already booked"
        )
    
    # Book the slot
    doctor['slots'][time_str] = appointment.patient_id
    save_doctors(doctors_data)
    
    return AppointmentResponse(
        message=f"Appointment booked successfully with {doctor['name']} at {appointment.time}:00",
        appointment={
            "doctor_id": appointment.doctor_id,
            "doctor_name": doctor['name'],
            "patient_id": appointment.patient_id,
            "patient_name": patients[appointment.patient_id]['name'],
            "time": f"{appointment.time}:00",
            "status": "Confirmed"
        }
    )

@app.post("/api/appointments/visit", tags=["Appointments"])
def record_doctor_visit(visit: DoctorVisit):
    """Record a doctor visit with prescribed medicine"""
    doctors_data = load_doctors()
    patients = load_patients()
    
    if visit.doctor_id not in doctors_data:
        raise HTTPException(status_code=404, detail="Doctor not found")
    
    doctor = doctors_data[visit.doctor_id]
    time_str = str(visit.time)
    
    if time_str not in doctor['slots']:
        raise HTTPException(status_code=400, detail="Invalid time slot")
    
    patient_id = doctor['slots'][time_str]
    
    if patient_id is None:
        raise HTTPException(
            status_code=400,
            detail="No appointment at this time slot"
        )
    
    if patient_id not in patients:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    # Add to patient history
    patients[patient_id]['history'].append({
        'Doctor': doctor['name'],
        'Time': visit.time,
        'Medicine': visit.medicine,
        'Date': datetime.now().strftime("%Y-%m-%d")
    })
    
    save_patients(patients)
    
    # Clear the slot
    doctor['slots'][time_str] = None
    save_doctors(doctors_data)
    
    return {
        "message": "Doctor visit recorded successfully",
        "patient": patients[patient_id]['name'],
        "doctor": doctor['name'],
        "medicine": visit.medicine
    }

@app.delete("/api/appointments/patients/{patient_id}", tags=["Appointments"])
def delete_patient(patient_id: str):
    """Delete a patient from registry"""
    patients = load_patients()
    
    if patient_id not in patients:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    patient_name = patients[patient_id]['name']
    del patients[patient_id]
    save_patients(patients)
    
    return {"message": f"Patient {patient_name} deleted successfully"}

@app.delete("/api/appointments/doctors/{doctor_id}", tags=["Appointments"])
def delete_doctor(doctor_id: str):
    """Delete a doctor from registry"""
    doctors_data = load_doctors()
    
    if doctor_id not in doctors_data:
        raise HTTPException(status_code=404, detail="Doctor not found")
    
    doctor_name = doctors_data[doctor_id]['name']
    del doctors_data[doctor_id]
    save_doctors(doctors_data)
    
    return {"message": f"Doctor {doctor_name} deleted successfully"}

# ==================== PHARMACY ENDPOINTS ====================

@app.get("/api/pharmacy/medicines", tags=["Pharmacy"])
def get_all_medicines():
    """Get all medicines in inventory"""
    medicines = load_medicines()
    result = []
    for name, data in medicines.items():
        result.append({
            "name": name,
            "stock": data.get("stock", 0),
            "serials": data.get("serials", {})
        })
    return result

@app.post("/api/pharmacy/medicines", status_code=201, tags=["Pharmacy"])
def add_medicine_serial(medicine: MedicineSerial):
    """Add a medicine serial (increases stock by 1)"""
    medicines = load_medicines()
    
    if medicine.name not in medicines:
        medicines[medicine.name] = {"stock": 0, "serials": {}}
    
    medicines[medicine.name]["serials"][medicine.serial] = {
        "expiry": medicine.expiry,
        "price": medicine.price
    }
    medicines[medicine.name]["stock"] = len(medicines[medicine.name]["serials"])
    
    save_medicines(medicines)
    
    return {
        "message": f"Added {medicine.name} (Serial {medicine.serial}, Expiry {medicine.expiry}, Price {medicine.price})",
        "medicine": {
            "name": medicine.name,
            "serial": medicine.serial,
            "expiry": medicine.expiry,
            "price": medicine.price,
            "current_stock": medicines[medicine.name]["stock"]
        }
    }

@app.delete("/api/pharmacy/medicines/{medicine_name}/{serial}", tags=["Pharmacy"])
def remove_medicine_serial(medicine_name: str, serial: str):
    """Remove a medicine serial (decreases stock by 1)"""
    medicines = load_medicines()
    
    if medicine_name not in medicines:
        raise HTTPException(status_code=404, detail="Medicine not found")
    
    if serial not in medicines[medicine_name]["serials"]:
        raise HTTPException(status_code=404, detail="Serial not found")
    
    del medicines[medicine_name]["serials"][serial]
    medicines[medicine_name]["stock"] = len(medicines[medicine_name]["serials"])
    
    save_medicines(medicines)
    
    return {
        "message": f"Removed serial {serial} of {medicine_name}",
        "current_stock": medicines[medicine_name]["stock"]
    }

@app.get("/api/pharmacy/medicines/{medicine_name}", tags=["Pharmacy"])
def search_medicine(medicine_name: str):
    """Search for a medicine and get all its serials"""
    medicines = load_medicines()
    
    if medicine_name not in medicines:
        raise HTTPException(status_code=404, detail="Medicine not found")
    
    return {
        "name": medicine_name,
        "stock": medicines[medicine_name]["stock"],
        "serials": medicines[medicine_name]["serials"]
    }

@app.post("/api/pharmacy/billing", tags=["Pharmacy"])
def bill_patient_pharmacy(billing: BillingRequest):
    """Bill a patient for medicine (FIFO - earliest expiry first, skips expired)"""
    medicines = load_medicines()
    patients = load_patient_billing()
    
    if billing.medicine_name not in medicines:
        raise HTTPException(status_code=404, detail=f"{billing.medicine_name} not found")
    
    if medicines[billing.medicine_name]["stock"] == 0:
        raise HTTPException(status_code=400, detail=f"{billing.medicine_name} out of stock")
    
    # Find earliest non-expired serial (FIFO with expiry check)
    serials = medicines[billing.medicine_name]["serials"]
    valid_serial = None
    expired_serials = []
    
    # Filter expired medicines and find earliest valid one
    for serial_num, details in list(serials.items()):
        expiry_date = datetime.strptime(details["expiry"], "%Y-%m-%d")
        if expiry_date < datetime.now():
            # Mark expired for removal
            expired_serials.append(serial_num)
        else:
            # Find earliest non-expired
            if (valid_serial is None or 
                expiry_date < datetime.strptime(serials[valid_serial]["expiry"], "%Y-%m-%d")):
                valid_serial = serial_num
    
    # Remove expired serials
    for expired in expired_serials:
        del serials[expired]
    
    # Update stock after removing expired
    medicines[billing.medicine_name]["stock"] = len(serials)
    
    if valid_serial is None:
        save_medicines(medicines)
        raise HTTPException(status_code=400, detail=f"No non-expired {billing.medicine_name} available")
    
    # Get details and remove from inventory
    details = serials[valid_serial]
    price = details["price"]
    del medicines[billing.medicine_name]["serials"][valid_serial]
    medicines[billing.medicine_name]["stock"] = len(medicines[billing.medicine_name]["serials"])
    save_medicines(medicines)
    
    # Update patient billing
    if billing.patient_name not in patients:
        patients[billing.patient_name] = {
            "purchases": [],
            "frequency": {},
            "total_price": 0
        }
    
    # Ensure total_price exists
    if "total_price" not in patients[billing.patient_name]:
        patients[billing.patient_name]["total_price"] = 0
    
    patients[billing.patient_name]["purchases"].append({
        "medicine": billing.medicine_name,
        "serial": valid_serial,
        "price": price,
        "date": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    })
    
    patients[billing.patient_name]["frequency"][billing.medicine_name] = (
        patients[billing.patient_name]["frequency"].get(billing.medicine_name, 0) + 1
    )
    
    patients[billing.patient_name]["total_price"] += price
    
    save_patient_billing(patients)
    
    return {
        "message": f"Billed {billing.patient_name} for {billing.medicine_name}",
        "patient": billing.patient_name,
        "medicine": billing.medicine_name,
        "serial_sold": valid_serial,
        "price_paid": price,
        "total_price": patients[billing.patient_name]["total_price"],
        "remaining_stock": medicines[billing.medicine_name]["stock"],
        "expired_removed": len(expired_serials)
    }

@app.get("/api/pharmacy/patients", tags=["Pharmacy"])
def get_billing_patients():
    """Get all patients with billing history"""
    patients = load_patient_billing()
    result = []
    for name, data in patients.items():
        result.append({
            "name": name,
            "total_purchases": len(data.get("purchases", [])),
            "total_price": data.get("total_price", 0),
            "frequency": data.get("frequency", {}),
            "purchases": data.get("purchases", [])
        })
    return {"patients": result}

@app.get("/api/pharmacy/analytics/most-demanded", tags=["Pharmacy Analytics"])
def get_most_demanded_medicine():
    """Get most demanded medicine using max heap"""
    patients = load_patient_billing()
    freq_map = {}
    
    for pdata in patients.values():
        for med, count in pdata.get("frequency", {}).items():
            freq_map[med] = freq_map.get(med, 0) + count
    
    if not freq_map:
        return {"message": "No billing records found", "medicine": None}
    
    # Build max heap (using negative for max heap with heapq)
    heap = []
    for med, count in freq_map.items():
        heapq.heappush(heap, (-count, med))
    
    freq, med = heap[0]
    
    return {
        "medicine": {
            "name": med,
            "frequency": -freq
        },
        "message": f"Most demanded: {med} (Demanded {-freq} times)"
    }

@app.get("/api/pharmacy/analytics/lowest-stock", tags=["Pharmacy Analytics"])
def get_lowest_stock_medicine():
    """Get medicine with lowest stock using min heap"""
    medicines = load_medicines()
    
    if not medicines:
        return {"message": "No medicines in inventory", "medicine": None}
    
    # Build min heap
    heap = []
    for name, data in medicines.items():
        stock = data.get("stock", 0)
        heapq.heappush(heap, (stock, name))
    
    stock, name = heap[0]
    
    return {
        "medicine": {
            "name": name,
            "stock": stock
        },
        "message": f"Lowest stock: {name} (Stock: {stock})"
    }

@app.get("/api/pharmacy/analytics/nearest-expiry", tags=["Pharmacy Analytics"])
def get_nearest_expiry():
    """Get medicine with nearest expiry using min heap"""
    medicines = load_medicines()
    min_heap = []
    
    for medicine_name, data in medicines.items():
        for serial, details in data.get("serials", {}).items():
            try:
                expiry_date = datetime.strptime(details["expiry"], "%Y-%m-%d")
                heapq.heappush(min_heap, (expiry_date, medicine_name, serial, details["price"]))
            except:
                continue
    
    if not min_heap:
        return {"message": "No medicines available", "medicine": None}
    
    expiry_date, medicine_name, serial, price = heapq.heappop(min_heap)
    
    return {
        "medicine": {
            "name": medicine_name,
            "serial": serial,
            "expiry": expiry_date.strftime("%Y-%m-%d"),
            "price": price,
            "days_until_expiry": (expiry_date - datetime.now()).days
        },
        "message": f"Nearest Expiry: {medicine_name} (Serial {serial}), Expires on {expiry_date.date()}"
    }

@app.delete("/api/pharmacy/clear-inventory", tags=["Pharmacy"])
def clear_inventory():
    """Clear all medicines from inventory"""
    save_medicines({})
    return {"message": "Inventory cleared successfully"}

@app.delete("/api/pharmacy/clear-billing", tags=["Pharmacy"])
def clear_billing():
    """Clear all billing records"""
    save_patient_billing({})
    return {"message": "Billing records cleared successfully"}

if __name__ == "__main__":
    import uvicorn
    print("=" * 60)
    print("🏥 Hospital Management System - Unified API")
    print("=" * 60)
    print("✅ Emergency Triage Module: LOADED")
    print("✅ Hospital Navigation Module: LOADED")
    print("✅ Doctor Appointment Module: LOADED")
    print("✅ Pharmacy Management Module: LOADED")
    print("")
    print("📍 Server: http://localhost:8000")
    print("📚 API Docs: http://localhost:8000/docs")
    print("🔄 Alternative Docs: http://localhost:8000/redoc")
    print("")
    print("🚑 Emergency Triage: /api/emergency/*")
    print("🗺️  Navigation: /api/navigation/*")
    print("📅 Appointments: /api/appointments/*")
    print("💊 Pharmacy: /api/pharmacy/*")
    print("❤️  Health Check: /api/health")
    print("")
    print("Press CTRL+C to quit")
    print("=" * 60)
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
