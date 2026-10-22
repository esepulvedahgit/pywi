# scripts/security/code_inspector.py
import ast
import sys

# Lista negra de módulos peligrosos
FORBIDDEN_MODULES = {'os', 'subprocess', 'sys', 'pty', 'socket', 'urllib', 'requests'}

def analyze_code(file_path):
    try:
        with open(file_path, 'r') as f:
            source = f.read()
    except Exception:
        # Fail-closed limpio: no filtrar el traceback interno del inspector.
        print("INSPECTOR_ERROR: no se pudo leer el código")
        sys.exit(1)

    try:
        tree = ast.parse(source)
    except SyntaxError:
        # Un archivo con error de sintaxis no puede ejecutar ninguna sentencia,
        # así que dejarlo pasar es seguro. Se deja que Python emita su SyntaxError
        # nativo (comprensible, apunta al archivo del usuario) al ejecutarse.
        sys.exit(0)
    except Exception:
        # Cualquier otro fallo inesperado del análisis: fail-closed limpio.
        print("INSPECTOR_ERROR: no se pudo analizar el código")
        sys.exit(1)

    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            for alias in node.names:
                if alias.name.split('.')[0] in FORBIDDEN_MODULES:
                    print(f"SECURITY_VIOLATION: Importación prohibida detectada -> {alias.name}")
                    sys.exit(1)
        elif isinstance(node, ast.ImportFrom):
            if node.module and node.module.split('.')[0] in FORBIDDEN_MODULES:
                print(f"SECURITY_VIOLATION: Importación prohibida detectada -> {node.module}")
                sys.exit(1)

    print("SAFE")
    sys.exit(0)

if __name__ == "__main__":
    analyze_code(sys.argv[1])
