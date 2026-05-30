"""
Plataforma Web IDE para Python
Demo: Operaciones Lógicas y Análisis de Datos
"""
import sys

print("--- Iniciando Ejecución en IDE Web para Python ---")

# 1. Ejemplo de datos (simulando un dataset)
students_data = [
    {"nombre": "Sofía", "edad": 21, "materia": "Machine Learning", "calificacion": 9.5},
    {"nombre": "Lucas", "edad": 22, "materia": "Deep Learning", "calificacion": 8.8},
    {"nombre": "Mateo", "edad": 20, "materia": "Lógica Avanzada", "calificacion": 7.2},
    {"nombre": "Valentina", "edad": 23, "materia": "Machine Learning", "calificacion": 10.0},
    {"nombre": "Santiago", "edad": 22, "materia": "Lógica Avanzada", "calificacion": 6.4}
]

# 2. Lógica de Filtrado y Procesamiento
print("\nProcesando Calificaciones Escolares:")
aprobados = []
suma_calificaciones = 0

for s in students_data:
    suma_calificaciones += s["calificacion"]
    if s["calificacion"] >= 7.0:
        aprobados.append(s["nombre"])
        print(f"  - {s['nombre']} aprobó {s['materia']} con {s['calificacion']}")
    else:
        print(f"  - {s['nombre']} reprobó (Calificación: {s['calificacion']})")

promedio = suma_calificaciones / len(students_data)
print(f"\nPromedio del grupo: {promedio:.2f}")
print(f"Alumnos aprobados: {', '.join(aprobados)}")

# 3. Lectura de Dataset CSV local (si existe)
try:
    with open('ventas.csv', 'r', encoding='utf-8') as f:
        print("\n--- Leyendo archivo ventas.csv ---")
        lineas = f.readlines()
        for i, linea in enumerate(lineas[:6]): # Mostrar primeras 5 filas
            print(f"Fila {i}: {linea.strip()}")
except FileNotFoundError:
    print("\n[Aviso] ventas.csv no ha sido creado o subido aún en este proyecto.")
    print("Puedes subir un dataset o crearlo en la barra lateral.")

print("\n--- Ejecución Finalizada Exitosamente ---")
