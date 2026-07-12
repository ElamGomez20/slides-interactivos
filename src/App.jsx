import { useEffect, useState } from "react";
import "./App.css";

const contactos = {
    cmb_general: "573185384697",
    escuela_biblica: "573176784539",
    obra_social: "573113252349",
    jovenes: "573237049379",
};

const config = {
    titulo_sitio: "CMB EL CERRITO",
    logo_url: "/media/logo.png",
};

const slides = [
    {
        id: 1,
        activo: true,
        tipo: "imagen",
        url_recurso: "/media/fervientes.png",
        titulo: "Fervientes",
        subtitulo: "Campamento Juvenil 2026",
        descripcion:
            "No te pierdas nuestro campamento juvenil, un tiempo de diversion, fraternidad y aprendizaje, desconectados del mundo exterior.",
        mensaje_whatsapp:
            "Hola, quiero mas informacion sobre el campamento juvenil Fervientes 2026.",
        contacto_whatsapp: "jovenes",
        etiqueta: "Jovenes",
    },
    {
        id: 2,
        activo: true,
        tipo: "imagen",
        url_recurso: "/media/horarios.png",
        titulo: "Horarios",
        subtitulo: "Servicios y actividades",
        descripcion:
            "Aqui podras encontrar nuestros horarios de cada servicio y actividad que tenemos en la semana.",
        mensaje_whatsapp:
            "Hola, quiero mas informacion sobre los horarios de servicios y actividades de CMB El Cerrito.",
        contacto_whatsapp: "cmb_general",
        etiqueta: "Iglesia",
    },
    {
        id: 3,
        activo: true,
        tipo: "imagen",
        url_recurso: "/media/vacacional.png",
        titulo: "Semana Vacacional",
        subtitulo: "Escuela biblica infantil",
        descripcion:
            "Un tiempo para todos los ninos en donde podran aprender de Dios mediante manualidades y una perspectiva distinta.",
        mensaje_whatsapp:
            "Hola, quiero mas informacion sobre la semana vacacional de la escuela biblica infantil.",
        contacto_whatsapp: "escuela_biblica",
        etiqueta: "Ninos",
    },
];

function App() {
    const [slideActual, setSlideActual] = useState(0);
    const [detalleAbierto, setDetalleAbierto] = useState(false);
    const [direccion, setDireccion] = useState("derecha");
    const [touchInicio, setTouchInicio] = useState(null);

    const slide = slides[slideActual];

    useEffect(() => {
        if (detalleAbierto) return;

        const intervalo = setInterval(() => {
            setDireccion("derecha");

            setSlideActual((actual) => {
                if (actual === slides.length - 1) {
                    return 0;
                }

                return actual + 1;
            });
        }, 15000);

        return () => clearInterval(intervalo);
    }, [detalleAbierto]);

    const cambiarSlide = (nuevoIndice, nuevaDireccion) => {
        setDireccion(nuevaDireccion);
        setSlideActual(nuevoIndice);
    };

    const irAlSiguiente = () => {
        if (slideActual === slides.length - 1) {
            cambiarSlide(0, "derecha");
        } else {
            cambiarSlide(slideActual + 1, "derecha");
        }
    };

    const irAlAnterior = () => {
        if (slideActual === 0) {
            cambiarSlide(slides.length - 1, "izquierda");
        } else {
            cambiarSlide(slideActual - 1, "izquierda");
        }
    };

    const iniciarTouch = (event) => {
        setTouchInicio(event.touches[0].clientX);
    };

    const terminarTouch = (event) => {
        if (touchInicio === null) return;

        const touchFinal = event.changedTouches[0].clientX;
        const diferencia = touchInicio - touchFinal;

        if (diferencia > 50) {
            irAlSiguiente();
        }

        if (diferencia < -50) {
            irAlAnterior();
        }

        setTouchInicio(null);
    };

    const abrirWhatsApp = () => {
        const telefonoDestino = contactos[slide.contacto_whatsapp] || contactos.cmb_general;
        const mensaje = encodeURIComponent(slide.mensaje_whatsapp);
        const url = `https://wa.me/${telefonoDestino}?text=${mensaje}`;

        window.open(url, "_blank");
    };

    const renderRecurso = (clase) => {
        if (slide.tipo === "video") {
            return (
                <video
                    className={clase}
                    src={slide.url_recurso}
                    autoPlay
                    muted
                    loop
                    playsInline
                />
            );
        }

        return <img className={clase} src={slide.url_recurso} alt={slide.titulo} />;
    };

    if (detalleAbierto) {
        return (
            <main className="app">
                <section className="detalle">
                    <button className="btn-volver" onClick={() => setDetalleAbierto(false)}>
                        Volver
                    </button>

                    <div className="detalle-card">
                        <div className="marca marca-detalle">
                            <img src={config.logo_url} alt="Logo CMB El Cerrito" />
                            <span>{config.titulo_sitio}</span>
                        </div>

                        <span className="etiqueta">{slide.etiqueta}</span>

                        <div className="detalle-media">
                            {renderRecurso("media-detalle")}
                        </div>

                        <h1>{slide.titulo}</h1>
                        <h2>{slide.subtitulo}</h2>
                        <p>{slide.descripcion}</p>

                        <button className="btn-whatsapp" onClick={abrirWhatsApp}>
                            Contactar por WhatsApp
                        </button>
                    </div>
                </section>
            </main>
        );
    }

    return (
        <main className="app">
            <section className="telefono">
                <div className="barra-superior">
                    <div className="marca">
                        <img src={config.logo_url} alt="Logo CMB El Cerrito" />
                        <span>{config.titulo_sitio}</span>
                    </div>

                    <span>
                        {slideActual + 1}/{slides.length}
                    </span>
                </div>

                <button
                    key={slide.id}
                    className={`zona-slide animacion-${direccion}`}
                    onClick={() => setDetalleAbierto(true)}
                    onTouchStart={iniciarTouch}
                    onTouchEnd={terminarTouch}
                >
                    <div className="slide-media">
                        {renderRecurso("media-slide")}
                    </div>

                    <div className="contenido-slide">
                        <span className="etiqueta">{slide.etiqueta}</span>
                        <h1>{slide.titulo}</h1>
                        <p>{slide.subtitulo}</p>
                    </div>
                </button>

                <div className="controles">
                    <button onClick={irAlAnterior}>Anterior</button>
                    <button onClick={() => setDetalleAbierto(true)}>Ver mas</button>
                    <button onClick={irAlSiguiente}>Siguiente</button>
                </div>

                <div className="puntos">
                    {slides.map((item, index) => (
                        <button
                            key={item.id}
                            className={index === slideActual ? "punto activo" : "punto"}
                            onClick={() => {
                                const nuevaDireccion = index > slideActual ? "derecha" : "izquierda";
                                cambiarSlide(index, nuevaDireccion);
                            }}
                        />
                    ))}
                </div>
            </section>
        </main>
    );
}

export default App;