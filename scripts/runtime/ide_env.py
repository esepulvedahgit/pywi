# scripts/runtime/ide_env.py
import os as _os

OUTPUT_DIR = _os.environ.get('OUTPUT_DIR', '')


def getcwd():
    return _os.getcwd()


def listdir(path='.'):
    # Solo permite listar dentro del proyecto: rechaza rutas absolutas y escapes con '..'
    if _os.path.isabs(path) or '..' in path.split(_os.sep):
        raise ValueError('listdir: ruta no permitida')
    return _os.listdir(path)


def clear():
    # Limpia la terminal con un código de escape ANSI (solo texto impreso).
    # No invoca ningún shell ni proceso externo, a diferencia de las alternativas
    # basadas en el módulo os que este helper reemplaza.
    print('\033[H\033[J', end='')


def get_secret(name, default=None):
    # Lee un secreto del proyecto (definido en la sección de Secretos del IDE),
    # inyectado por el servidor como variable de entorno de este proceso.
    return _os.environ.get(name, default)
