# scripts/security/code_inspector.py
import ast
import sys

# Lista negra de módulos peligrosos
FORBIDDEN_MODULES = {'os', 'subprocess', 'sys', 'pty', 'socket', 'urllib', 'requests'}

def analyze_code(file_path):
    with open(file_path, 'r') as f:
        tree = ast.parse(f.read())
    
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
    analyze_code(sys.argv[1])/agen