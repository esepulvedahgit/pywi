export interface PresetTemplate {
  name: string;
  description: string;
  type: 'logic' | 'ml' | 'dl';
  code: string;
}

export const PRESET_TEMPLATES: PresetTemplate[] = [
  {
    name: "Cálculo Lógico y Análisis",
    description: "Algoritmo de análisis de frecuencia, limpieza de textos, lógica de bucles y formato de cadenas.",
    type: "logic",
    code: `"""
Preset: Análisis de Frecuencia y Procesamiento Lógico
Ideal para comprobar filtros de texto rápidos y loops de Python en el terminal.
"""
import sys

texto_analisis = """
El aprendizaje automático (Machine Learning) y el aprendizaje profundo (Deep Learning) 
revolucionan la toma de decisiones. El IDE web para Python permite programar algoritmos de 
lógica, inteligencia artificial y matemáticas desde cualquier pantalla móvil táctil.
"""

def limpiar_y_contar(texto):
    print(" Limpiando texto...")
    palabras_limpias = []
    # Eliminar signos comunes
    for p in texto.lower().split():
        p_limpia = p.replace(",", "").replace(".", "").replace("(", "").replace(")", "")
        if len(p_limpia) > 3: # Filtrar conectores cortos
            palabras_limpias.append(p_limpia)
            
    # Contar frecuencias
    frecuencias = {}
    for palabra in palabras_limpias:
        frecuencias[palabra] = frecuencias.get(palabra, 0) + 1
        
    return frecuencias

frec = limpiar_y_contar(texto_analisis)

# Ordenar por frecuencia
frec_ordenada = sorted(frec.items(), key=lambda x: x[1], reverse=True)

print("\\n--- Resultados del Filtro de Frecuencia de Palabras (Top 5) ---")
for i, (palabra, conteo) in enumerate(frec_ordenada[:5]):
    print(f" {i+1}. Palabra: '{palabra}' -> Aparece: {conteo} veces")

print("\\n--- Reporte de Longitud de Palabras ---")
largas = [pal for pal in frec.keys() if len(pal) > 10]
print(f"Palabras complejas (> 10 caracteres): {', '.join(largas)}")
`
  },
  {
    name: "Machine Learning (K-Means)",
    description: "Rutina matemática completa de K-Means Clustering y lectura de dataset con Pandas o simulación.",
    type: "ml",
    code: `"""
Preset: K-Means Clustering y Análisis de Datos
Carga bases de datos csv o las simula matemáticamente.
Ejecuta la partición de clusters paso a paso imprimiendo centroides.
"""
import random
import math

# 1. Simulación de Puntos de Datos (X, Y) que representan Clientes o Ventas
# Cluster 1 (Bajo gasto, alta frecuencia): Alrededor de (2, 8)
# Cluster 2 (Alto gasto, baja frecuencia): Alrededor de (8, 2)
# Cluster 3 (Moderado, moderado): Alrededor de (5, 5)
random.seed(42)
datos = []
for _ in range(15): datos.append((random.normalvariate(2, 0.5), random.normalvariate(8, 0.5)))
for _ in range(15): datos.append((random.normalvariate(8, 0.5), random.normalvariate(2, 0.5)))
for _ in range(15): datos.append((random.normalvariate(5, 0.5), random.normalvariate(5, 0.5)))

print(f"✓ Dataset inicializado con {len(datos)} elementos tridimensionales.")

# 2. Algoritmo K-Means desde cero
def distancia_euclideana(p1, p2):
    return math.sqrt((p1[0] - p2[0])**2 + (p1[1] - p2[1])**2)

k = 3
# Inicializar centroides aleatorios
centroides = [datos[random.randint(0, len(datos)-1)] for _ in range(k)]

print("\\nIniciando optimización del Modelo K-Means:")
for epoch in range(5):
    clusters = {i: [] for i in range(k)}
    
    # Asignar puntos al centroide más cercano
    for punto in datos:
        distancias = [distancia_euclideana(punto, c) for c in centroides]
        centroide_cercano = distancias.index(min(distancias))
        clusters[centroide_cercano].append(punto)
        
    # Recalcular centroides
    nuevos_centroides = []
    for i in range(k):
        puntos_cluster = clusters[i]
        if puntos_cluster:
            promedio_x = sum(p[0] for p in puntos_cluster) / len(puntos_cluster)
            promedio_y = sum(p[1] for p in puntos_cluster) / len(puntos_cluster)
            nuevos_centroides.append((promedio_x, promedio_y))
        else:
            nuevos_centroides.append(centroides[i])
            
    centroides = nuevos_centroides
    print(f" Epoca {epoch+1}: Centroides = " + ", ".join([f"({c[0]:.2f}, {c[1]:.2f})" for c in centroides]))

print("\\n--- Clasificación K-Means Finalizada ---")
for i in range(k):
    print(f" Cluster {i+1} contiene: {len(clusters[i])} puntos asignados.")
`
  },
  {
    name: "Deep Learning (Red Neuronal)",
    description: "Entrenamiento de una neurona para clasificación binaria (Puerta Lógica XOR) con ajuste de pesos y épocas.",
    type: "dl",
    code: `"""
Preset: Red Neuronal de Clasificación Lógica (Puerta Lógica XOR)
Ejecuta la propagación hacia adelante (forward) y retropropagación (backprop)
para entrenar una neurona con un set de datos de entrenamiento binario.
"""
import math

# Función de activación Sigmoide
def sigmoide(x):
    return 1 / (1 + math.exp(-x))

# Derivada del sigmoide para backpropagation
def sigmoide_derivada(x):
    return x * (1 - x)

# Entradas para la función XOR de prueba
entradas = [
    [0, 0],
    [0, 1],
    [1, 0],
    [1, 1]
]
# Resultados esperados (Clases de entrenamiento)
esperados = [0, 1, 1, 0]

# Hiperparámetros de la Red Neuronal
learning_rate = 0.4
epocas = 500

# Inicialización de pesos y sesgos (pesos sinápticos)
# Una capa oculta con 2 neuronas, una de salida
w_ocultos = [[0.15, 0.20], [0.25, 0.30]] # Pesos de entrada a oculta
b_ocultos = [0.35, 0.35]                 # Sesgo oculta
w_salida = [0.40, 0.50]                 # Pesos de oculta a salida
b_salida = 0.60                         # Sesgo salida

print(f"--- Entrenando Red Neuronal Artificial (Pesos Iniciales Cargados) ---")
print(f"Tasa de aprendizaje: {learning_rate} | Epocas: {epocas}")

for epoch in range(epocas):
    error_acumulado = 0
    for i, ent in enumerate(entradas):
        # 1. Forward Pass (Propagación hacia adelante)
        # Capa oculta
        h1 = sigmoide(ent[0]*w_ocultos[0][0] + ent[1]*w_ocultos[1][0] + b_ocultos[0])
        h2 = sigmoide(ent[0]*w_ocultos[0][1] + ent[1]*w_ocultos[1][1] + b_ocultos[1])
        
        # Capa de salida
        salida = sigmoide(h1*w_salida[0] + h2*w_salida[1] + b_salida)
        
        # Calcular pérdida (Error cuadrático medio)
        target = esperados[i]
        error = target - salida
        error_acumulado += 0.5 * (error ** 2)
        
        # 2. Backward Pass (Retropropagación de errores)
        # Gradiente en la salida
        delta_salida = error * sigmoide_derivada(salida)
        
        # Gradientes en capa oculta
        delta_h1 = delta_salida * w_salida[0] * sigmoide_derivada(h1)
        delta_h2 = delta_salida * w_salida[1] * sigmoide_derivada(h2)
        
        # Actualización de pesos y sesgos de salida
        w_salida[0] += learning_rate * delta_salida * h1
        w_salida[1] += learning_rate * delta_salida * h2
        b_salida += learning_rate * delta_salida
        
        # Actualización de pesos y sesgos ocultos
        w_ocultos[0][0] += learning_rate * delta_h1 * ent[0]
        w_ocultos[1][0] += learning_rate * delta_h1 * ent[1]
        b_ocultos[0] += learning_rate * delta_h1
        
        w_ocultos[0][1] += learning_rate * delta_h2 * ent[0]
        w_ocultos[1][1] += learning_rate * delta_h2 * ent[1]
        b_ocultos[1] += learning_rate * delta_h2

    # Mostrar progreso parcial cada 100 épocas
    if (epoch + 1) % 100 === 0 or epoch === 0:
        print(f" Epoca {epoch+1:03d} -> Error de Red Cuadrático Medio: {error_acumulado:.6f}")

print("\\n--- Resultados Finales de Predicción XOR neuronal ---")
for ent in entradas:
    h1 = sigmoide(ent[0]*w_ocultos[0][0] + ent[1]*w_ocultos[1][0] + b_ocultos[0])
    h2 = sigmoide(ent[0]*w_ocultos[0][1] + ent[1]*w_ocultos[1][1] + b_ocultos[1])
    salida = sigmoide(h1*w_salida[0] + h2*w_salida[1] + b_salida)
    clasificacion = "1 (V)" if salida >= 0.5 else "0 (F)"
    print(f" Entrada {ent} -> Predicción Neuronal: {salida:.4f} [Clase: {clasificacion}]")
print("--- Entrenamiento Finalizado Exitosamente ---")
`
  }
];
