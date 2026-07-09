import { useEffect, useState } from "react";
import "./App.css";
import slidesData from "./data/slides.json";

const telefonoWhatsApp = "573161553896";

const extensionesPermitidas = [".jpg", ".png", ".mp4"];

const esRecursoPermitido = (url) => {
    if (!url) return false;

    const archivo = url.toLowerCase().split("?")[0];

    return extensionesPermitidas.some((extension) => archivo.endsWith(extension));
};

const slides = slidesData.slides.filter((slide) => {
    return slide.activo === true && esRecursoPermitido(slide.url_recurso);
});

function App() {
    const [slideActual, setSlideActual] = useState(0);
    const [detalleAbierto, setDetalleAbierto] = useState(false);

    useEffect(() => {
        if (detalleAbierto) return;
        if (slides.length === 0) return;

        const intervalo = setInterval(() => {
            setSlideActual((actual) => {
                if (actual === slides.length - 1) {
                    return 0;
                }

                return actual + 1;
            });
        }, 15000);

        return () => clearInterval(intervalo);
    }, [detalleAbierto]);

    if (slides.length === 0) {
        return (
            <main className="app">
                <section className="telefono">
                    <div className="barra-superior">
                        <span>Slides Interactivos</span>
                        <span>Sin contenido</span>
                    </div>

                    <div className="zona-slide">
                        <div className="contenido-slide">
                            <span className="etiqueta">Aviso</span>
                            <h1>No hay slides disponibles</h1>
                            <p>
                                Revisa que los slides esten activos y que los archivos sean .jpg,
                                .png o .mp4.
                            </p>
                        </div>
                    </div>
                </section>
            </main>
        );
    }

    const slide = slides[slideActual];

    const irAlSiguiente = () => {
        if (slideActual === slides.length - 1) {
            setSlideActual(0);
        } else {
            setSlideActual(slideActual + 1);
        }
    };

    const irAlAnterior = () => {
        if (slideActual === 0) {
            setSlideActual(slides.length - 1);
        } else {
            setSlideActual(slideActual - 1);
        }
    };

    const abrirWhatsApp = () => {
        const mensaje = encodeURIComponent(slide.mensaje_whatsapp);
        const url = `https://wa.me/${telefonoWhatsApp}?text=${mensaje}`;
        window.open(url, "_blank");
    };

    const renderRecurso = (clase) => {
        const archivo = slide.url_recurso.toLowerCase();

        if (slide.tipo === "video" && archivo.endsWith(".mp4")) {
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

        if (slide.tipo === "imagen" && (archivo.endsWith(".jpg") || archivo.endsWith(".png"))) {
            return <img className={clase} src={slide.url_recurso} alt={slide.titulo} />;
        }

        return (
            <div className={clase}>
                Archivo no permitido
            </div>
        );
    };

    if (detalleAbierto) {
        return (
            <main className="app">
                <section className="detalle">
                    <button className="btn-volver" onClick={() => setDetalleAbierto(false)}>
                        Volver
                    </button>

                    <div className="detalle-card">
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
                    <span>Slides Interactivos</span>
                    <span>{slideActual + 1}/{slides.length}</span>
                </div>

                <button className="zona-slide" onClick={() => setDetalleAbierto(true)}>
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
                            onClick={() => setSlideActual(index)}
                        />
                    ))}
                </div>
            </section>
        </main>
    );
}

export default App;