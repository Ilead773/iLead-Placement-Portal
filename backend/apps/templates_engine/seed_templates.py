# apps/templates_engine/seed_templates.py
import os
import sys
import django

# Setup Django
sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.templates_engine.models import ResumeTemplate

def seed_modern_template():
    name = "Modern Professional"
    description = "A sleek, high-fidelity resume template designed for tech and corporate roles. Features clean typography and an authoritative layout."
    
    html_template = """
<div class="resume-wrapper">
    <header class="resume-header">
        <h1>{{ personal.name }}</h1>
        <div class="contact-info">
            {% if personal.email %}<span>{{ personal.email }}</span>{% endif %}
            {% if personal.phone %}<span>{{ personal.phone }}</span>{% endif %}
            {% if personal.location %}<span>{{ personal.location }}</span>{% endif %}
        </div>
        <div class="social-links">
            {% if personal.linkedin %}<span>LinkedIn: {{ personal.linkedin }}</span>{% endif %}
            {% if personal.github %}<span>GitHub: {{ personal.github }}</span>{% endif %}
            {% if personal.portfolio %}<span>Portfolio: {{ personal.portfolio }}</span>{% endif %}
        </div>
    </header>

    {% if summary %}
    <section class="section">
        <h2 class="section-title">Professional Summary</h2>
        <p class="summary-text">{{ summary }}</p>
    </section>
    {% endif %}

    {% if experience %}
    <section class="section">
        <h2 class="section-title">Work Experience</h2>
        {% for exp in experience %}
        <div class="item">
            <div class="item-header">
                <span class="item-title">{{ exp.position }}</span>
                <span class="item-date">{{ exp.duration.start }} — {{ exp.duration.end|default:"Present" }}</span>
            </div>
            <div class="item-subtitle">{{ exp.company }}</div>
            <div class="item-description">{{ exp.description }}</div>
            {% if exp.achievements %}
            <ul class="achievements-list">
                {% for achievement in exp.achievements %}
                <li>{{ achievement }}</li>
                {% endfor %}
            </ul>
            {% endif %}
        </div>
        {% endfor %}
    </section>
    {% endif %}

    {% if projects %}
    <section class="section">
        <h2 class="section-title">Key Projects</h2>
        {% for proj in projects %}
        <div class="item">
            <div class="item-header">
                <span class="item-title">{{ proj.title }}</span>
                <span class="item-date">{{ proj.date }}</span>
            </div>
            <div class="item-description">{{ proj.description }}</div>
            <div class="technologies">
                <strong>Tech:</strong> {{ proj.technologies|join:", " }}
            </div>
            {% if proj.link %}<div class="project-link">Link: {{ proj.link }}</div>{% endif %}
        </div>
        {% endfor %}
    </section>
    {% endif %}

    <div class="two-column">
        {% if skills %}
        <section class="section">
            <h2 class="section-title">Technical Skills</h2>
            {% for skill_group in skills %}
            <div class="skill-group">
                <strong>{{ skill_group.category }}:</strong> {{ skill_group.items|join:", " }}
            </div>
            {% endfor %}
        </section>
        {% endif %}

        {% if education %}
        <section class="section">
            <h2 class="section-title">Education</h2>
            {% for edu in education %}
            <div class="item">
                <div class="item-header">
                    <span class="item-title">{{ edu.degree }}</span>
                </div>
                <div class="item-subtitle">{{ edu.institution }}</div>
                <div class="item-date">Graduation: {{ edu.graduation_date }}</div>
                {% if edu.gpa %}<div class="gpa">CGPA: {{ edu.gpa }}</div>{% endif %}
            </div>
            {% endfor %}
        </section>
        {% endif %}
    </div>
</div>
"""

    css_styles = """
:root {
    --primary: #1e293b;
    --accent: #3b82f6;
    --text-main: #334155;
    --text-muted: #64748b;
    --border: #e2e8f0;
}

body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    line-height: 1.5;
    color: var(--text-main);
    margin: 0;
    padding: 0;
    background: white;
}

.resume-wrapper {
    max-width: 800px;
    margin: 40px auto;
    padding: 40px;
    background: white;
}

.resume-header {
    text-align: center;
    border-bottom: 2px solid var(--primary);
    padding-bottom: 20px;
    margin-bottom: 30px;
}

.resume-header h1 {
    margin: 0 0 10px 0;
    font-size: 32px;
    font-weight: 800;
    color: var(--primary);
    text-transform: uppercase;
    letter-spacing: -1px;
}

.contact-info, .social-links {
    font-size: 11px;
    color: var(--text-muted);
    display: flex;
    justify-content: center;
    gap: 15px;
    margin-bottom: 5px;
}

.section {
    margin-bottom: 25px;
}

.section-title {
    font-size: 14px;
    font-weight: 800;
    color: var(--accent);
    text-transform: uppercase;
    letter-spacing: 1px;
    border-bottom: 1px solid var(--border);
    padding-bottom: 5px;
    margin-bottom: 15px;
}

.summary-text {
    font-size: 13px;
    text-align: justify;
}

.item {
    margin-bottom: 15px;
}

.item-header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
}

.item-title {
    font-size: 15px;
    font-weight: 700;
    color: var(--primary);
}

.item-date {
    font-size: 11px;
    font-weight: 600;
    color: var(--text-muted);
}

.item-subtitle {
    font-size: 13px;
    font-weight: 600;
    color: var(--text-main);
    margin-bottom: 4px;
}

.item-description {
    font-size: 12px;
    color: var(--text-main);
}

.achievements-list {
    margin: 8px 0 0 0;
    padding-left: 20px;
    font-size: 12px;
}

.technologies, .gpa, .project-link {
    font-size: 11px;
    margin-top: 5px;
}

.two-column {
    display: grid;
    grid-template-cols: 1fr 1fr;
    gap: 40px;
}

.skill-group {
    font-size: 12px;
    margin-bottom: 8px;
}

@media print {
    .resume-wrapper {
        margin: 0;
        padding: 0;
    }
}
"""

    template, created = ResumeTemplate.objects.get_or_create(
        name=name,
        defaults={
            'description': description,
            'html_template': html_template,
            'css_styles': css_styles,
            'is_active': True
        }
    )
    
    if created:
        print(f"Created template: {name}")
    else:
        print(f"Template {name} already exists.")

def seed_ilead_kolkata_template():
    name = "iLEAD Kolkata Standard"
    description = "The official iLEAD Kolkata Standard template styled exactly according to university guidelines."
    
    html_template = """<div class="resume-container">
    <header class="resume-header">
        <div class="header-left">
            <div class="photo-frame">
                {% if personal.photo %}
                    <img src="{{ personal.photo }}" alt="" class="candidate-photo">
                {% else %}
                    <div class="photo-placeholder">Insert a <br>formal picture <br>(Current)</div>
                {% endif %}
            </div>
        </div>
        
        <div class="header-center">
            <h1 class="candidate-name">{{ personal.name|default:"Full Name" }}</h1>
            <div class="linkedin-link">
                {% if personal.linkedin %}
                    <a href="{{ personal.linkedin }}" target="_blank">{{ personal.linkedin }}</a>
                {% else %}
                    <a href="#" class="placeholder-link">LinkedIn Link (just add the link) - MANDATORY</a>
                {% endif %}
            </div>
            <div class="portfolio-link">
                {% if personal.portfolio %}
                    <a href="{{ personal.portfolio }}" target="_blank">{{ personal.portfolio }}</a>
                {% else %}
                    <a href="#" class="placeholder-link">Portfolio Link (For BMS, MSc Media, BMAGD, MMAGD, FTP Students)</a>
                {% endif %}
            </div>
            <div class="contact-row">
                <span>
                    <span class="icon-circle"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg></span>
                    {{ personal.phone|default:"Mobile Number" }}
                </span>
                <span>
                    |
                    <span class="icon-circle"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg></span>
                    {{ personal.email|default:"Email ID" }}
                </span>
                <span>
                    |
                    <span class="icon-circle"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg></span>
                    {{ personal.location|default:"City, State" }}
                </span>
            </div>
        </div>
        
        <div class="header-right">
            <div class="logo-container">
                {% if institute_logo %}
                    <img src="{{ institute_logo }}" alt="iLEAD Logo" class="institute-logo">
                {% else %}
                    <img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAHQAAAA6CAYAAABhyH07AAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAABF5SURBVHgB7VwJdBzFmf6rj+k5NJrRrZFkXZZ12JJlIdvY2LAmxoAcMAsxIQqBBMx6iQMhwbB54UzM8naTDV7vAnsYMGDAya5jEvBL/GwgEBwbfGF8X7IsWfc5mvvoo1I1h5E0PaORIsnye/O990s93XV1/f3/Vf/RzYIKNlgKvo1A7mzw+73kJ4YErhgwaiczWf72x9PyXyCHCiRwRUGVoWUafWalTv8NcogggSsKwxnK0j95vOZqScH6OwRTUei8EPrPQQJTGsywY/lPBbOebpX8gk2W4ZrU5LzQNV9jSc3vyX8JElI7pRFmKJVM5Te5M24p0QjrPIosmlkWTrh9reGCJl5z3ZPplrmQ2CRNaVCGUmbK/59bsnKp0bS9SfKJGCPGh6DndVt3I4Qk0iNJTJXe+I+QwJQGXRPlHcWz6qtZYcspn0ckv1GpVs/u6m9bBkFmoqczcub4AZtmarRXQQJTGsxjWQVFczn9lvNEMgnvUKXWwB13Diy/p7vtCAQZrvwg1fJJq+gjP1Bi/ZziYFYmJf/2hM8tCcDwswWd/w1H+4ylrWd3kGsaQuLB6bOPXfT7jAJioMHva4QEpjQYSZYrygQdpyB423z6gOHR1tYL9HwdlCBnxfx2CSuVIgZsYBho9olbIYGpjbaKuedeyiq8OvRTS/9szJl+jb1iHt5dOEveU1Sp7C6slKzl8+juFkHCbJnS4HJPHSwNHfOEvF8Uz341leNWHfF6JAYhsoZiJZ3n2Y9dtkchYbJMeYSlLWC6WCvmn2j0eWZ6MXUgYI6wTxYYhs3i+Z3Tzhy6GYLrqh+C5k7CzzsFcckO7a+Yf/yU113hUTCmzJQRSOkcz2Yi2BxiJlXH/m2Wogcgwcwpi4C7771ppY+2+H2zFEwNF8pPUGo0Ou6E4rk1//zR75IyOkLePxTMeqo0KWk1JDBlEXC2z9EZf3JR9GEGYaJnGSad59rXWC+WvdXV5YagmvWcLqt9zozhqS323n+CBKYsKEN5IqapVFQRkc9sXnO44Owh6hFiQ+Q/XlK9U5KkGwWNAIedfW9CApcT4X2P6gaVMlQkXPNgjA2zdHrRfOpA2L0nE2KsFVe3nfO5LaQ6Pul1v/OW09kNCVwuhDejVYTmhY6p0B0kRD17TCDacsjj/sjAsMzv7QP/TH+bZq9amjTzWw9C+grDBVvHNj3Lo2KNYF904fg9kIiJXi5QyaQMpJvSJEKbCL1B6DUILourQ9cBrTVbCpSqxZhwy5B9145PC+/+CBfc9Uc84/5DGK57clpLUcmfV5EyEAqAJ3BZQBl6LaE5hKgjyEaI5nwNQFBiqT9hySWvz5nCkvVl+us3F8/55mG/owOT5ZRskRRJm1omnX9zgQ5G0N0JTApWQVAiqeVRT4iak7MIHYKgWXlPOMDNlTU1PJqXUVDvd1up7RJgHkIMq0geLWRlGSDIyAQzLx8ow9yhY8IkWEpoF6F3Cf0kdL4/zFCaWgI2a+MmwVQAZINEfxNrVMYgCA3Q1eWCBC43KE/C/NIT2k/oeUI0Teg/Qtc0g3OKkOPopjOurgPf06aXc3xyAeKzSrsvfPpcJSTWzqkAytA0CG6A6P8UQn8m9BKhdghuiFKHVwozjjFaStPDx5DAVADlA82+pJYIXRLLB12jJsy/EtKHNzrcaotF02IwyGotTXO52I0dHdQpHxR7i0VLVDF5IgpVewZ9twInT9J0lnjWXM5iqdV0CH0h/3AhjAlNdGyf0P7kOGswULhEQysO6VfyIWi9yQfwMzSatsg9aDsMNhkkCcV1D1wrhoYaMuatw/ug/eKoYw6aLN+HoMrtI5RDqITQ24TsYYYisXKR2Cf6IpsgTWdqtMAc/wsV9cCkF6z49YuMOe8hUKQIJz0rmJmBs++v7t397CsQB1KKbzBl3LxxQLQ3K4CJIxnhUcdbEaNF7s79Ozt3PVIXbxVCeMaDp0XJ2cEM7pdEDJHo7d/ZsvW2eNsKIHf5xpeFjKo1WPbGGbggfcqiLMteu+J1tPjszZ/6+s//xn701c8Hj1GtYug8XTszCFFHTxuEnA5hJwE+6LZ1kDhLnloLHqyEdXQA1rPvfpZSff9Dsqc3Qh0rOjdgW9tRiBPWxg9d5oFGUXR28DBGIFYA2d1rH00dY+mN5aKjnZMcbcOuYOCN+YthlGaa13p+H6NNXYMlz2iWKLrEpZOnKF2bUlRjyK55JGPOfZKr68vNnV+8/Aj0nHRC0JEjDRlgEK0hCiPAn0udc4hhoo4c4yGDZFgNH1UbkafCr4ij2UQhMkQUtTFiQWnMhcAn58WgaUQzpGZC/MDJ02/7qezsVB2OInuSUqpXL4JRgCEmXjTeY4wkeh8sCX0A4iBQFA0SQHKbWBZBcveAb6CB4XWp9xd/fZMjt+6/noAgM+Oez7G58XBstciPutmoSwbCinKgce991yaBJVmtBHKxWGI8Wh7l6SA+BGaST6taKdmbFKqwhxeQXb04qXDps9YjG5dBvGCizwliWQ67+97sM3ibTV6WlSTQsULKQk1KyQLZ1Ylkv1tCDApNGhEsRQJ/31mZTcp9vujbH9x1YcuyagjFrWEEcBF3ClMLxFvFQkODzwkNPbHKeWAf/RfXLSRXr5qPJbc+VnoUZ8q9HkpKBNK3H/7GadEYc6H18w2/9HfuC+jQQUBZ1z//I33+19b7+89KxJHzFT8QYhWfTZG9jqri+w42N74+l7peh6vfCEwNkwQxMSYMjWYy4ymLjTlXP0vW3OglSBxRdnWxqVn1t8E4PONUnbI6Q5LKJabr4yf/vfvQa9lcUg4bcugMHghDEw5E67lpBXdu/wTieLdoCEOjjRwhNLGCi5XJyiSk/TCatPI60idNzVBCueMRqkwR3Tg5u+YpmFgE+nUdf7W7r3lbtmAu5MiIhksgIg8ERpzwd5lz1464BAxhaLRZxRhP1oRPOFLn/fhGxTeAAoxErAtk/Dtyh6qbDsaQVUXNKpj41FXs3Ps/3a6uo6tYQc9FaCWii0Vnu5xU+U2aFx1Op1VFXCoXIRjewZXqpMf6vAXrZK8NB3aWWDlhPf7rNaxBdYOMJFc78JZraJxxMu6X7dr10CZWnzZAFUfEYMjOSvZaTeaqVdfFGk9cDCUCetkklDxL49U3aadWrzFmUzcZMEIy8vQcXu9q+mMnw1HjOXKSFL8H6/MXP/ZV/QlFQP06Gj/+OeJ1qn3J7j76QD4Rq5G41tCIK+OtgmNIPB4/6cAZC/++XnT1BFjD6dKhv+f99+kFX++p3yGk8tDSk6wmU1t8Sz5MDpDYcvBNTp8V5bICmrRiGuSOT+VGKzXhm6IYDz8aR8nQ51U/hv1usiUgO0dX1z5qDtEu3M17X2AN6ap1iCcJm8tX0HjjZKhdbLv4BysWHdG8XggprF5fcUd2tAYuMTTWxifi2ngzOJbEIyZeBzlFNI8KAkttOiOklNNDjqhbZ+f+58IXB05uPow4nUtN7RLHBujTSu+51M4kgASiG6I9P4roAF7IqIxW95IhG5BCrN7IxEsojnoeYZxqqqhfhhGToVoEMQrmkcDpzKL1s//cEq2hnOl3rJLcnQGWMNo0sO7dtxMGOSL8vWe3IY323oihkP2wIovG5NI75tnPvnsAJgG+rmONvLnoKuoxGg76zPFYnE4OP1CrG5ePLkJCJ8+MwcQTNt1cfe8utZ1fuAhiNODu/JKmY0RjKGiK5q+RBjpIhEMBv8a9l4TaBs8Wcrfu+ZWpsv5eyRWZpUrUMzaV3v40YegKmAwwjDPaJcXvAK2lNhuObFKvCuMOuuOQYJwQtPqJV0fy9EchK8hestMX7bZobZgrlhcgmcun0sYaM5Hjy9+uG1YGW4+9cQyxWoea2kXEB8GnFtwMtbU8TILaVYCN6sZChGWS6I3KtyESGrdejamCyYZj3PgZmD0fk5TTzIKkGl6jdyYyAs8OmKLdJNZaljwsubuAxj0RbwD7F698ACp+X7n/9P9hLukBNPxdLPIgSF47b1bm1w3Aoe0wwUCSPyfqRVYD2NfZF+3yhCRN8+PWLKLG/+fNW5YuibOCqvNam33V9yRHO9HN5LGwNlDVrKq/u5qO/CLnqhUPiPbIOIDs6cemkuXPDBz+7/dhopGSlh5tiWE1OnD1X2yPVnXqR1tI6HIUxSP8oKnV/zCT7BrTqLuL0ejBfuGzHfqCG2qCwclB/WAOacQzvYqoeCD4tt3Qhmh9XWptevoiY2/vHidM4FRpuexiWaSWS6R2p6FjDTAno9Wd8q81kA3Z3/IuKtbm1DwhO4MSp3htoqlo2Qam/Bs0BBJZmEyW5GiRqSSrAMnOdkBldd+F3j0vwQQCCYYcIOYJqIyQ4fTQb98d9eMlY1tDJxVj3oMEFI6QVnm7aGvCQRFjedlvB0rRa7FRswMUkbgCp82lToaXYIIUmqns1iKy1utVLxJ1RezQC9Da6olWPy6VS6JyV6Qz3jj/RwsV0akLRBewJGtMheyILCAxZsnZAYrso+l7QzUYoiFobZ6+4iaL+9TOTpgAaMvr6mVHl6r9wfBa5O744vVY9eOzQ5XJ8ZCMM0g8c8E6hTi0qXeCN+YrFz7/pQEGGjUxa/UmebO+Vv+CJjn3YTXDXnS0ganotscIQ9fC+CKQtaczlD0uOdsjQmRUODljFtPz8cYXIYZ2iHMNnWDn/Pgj8PkdrTl3qc/aRENPjLfr2GZo2EF9t76R6tpbi3+RPe8HD4uOVhobGHqviowFcwV9aWgtjK/aVTKufW4lFt1mtZAnUZKM1+baDtYPbbEamZCMBRHG0RAdI1LmPfx10UsD2Rixhixwdhz4N4hvQcaes1vbFMbXreoKpREYJJsM5XfSV/jinhc+thCwUFInGItv2Cp7++Thw8RYlrUpM6H9+A/vhBGcQXHGQ2EUznkEY06wVe0cxgJsyFn4c8U7QMPY1LvS6zz5zsnRNOBpP/Yy4jhVJkiOTmysqHsGRgFRfc6CH/KqrWWKFz/b5+s/Iw/flNE8I40hh7V3HVkRig7F3PXH6fobxazSnFMl8BJqPNCMVIBoy5FU5PD2EGTNNvCmgho6bIYVwPPVRiLeG0Ge0zte5ozTVOvQ8JveUHIrwM+Cn6YYCWSjRXbI/RHna2u5zGvX3V1Usd7r6ztNotosM6wfmRWSOb+n+3+7djxAPVQj5ufGt8sd/nTFUB8KGbe2YP6/WHJndpD+VdZoJCmSN1mXu7y46e3qBQCxBDqwnym1LF3/K4yUFKSWHajQZ9iXqeTXnu9+6yb6tTNIL7mlXqJJ1ETdckk50HPkxdGaGdjR9lFfiveHLeRe8yI+QkqzAv1OwVR98QbbkcA7mjFBU1lSKr61BUpvt5PxMpBsAkGXn8Owuumyr58Tbc0yCmRfDxoAuStOn84Rnr7a9t53HoTgPIkj9RWXHYpHIaEYiwqrMa4AjTl6i9QkFNvb4moQoXTOaFkbLbQXKMLrwHvug23h30TdPi57rYEKst9x0du45yKMAe7W/Rt02TUvYCnS7JO9/Ti5aOnTtiObQgyNkXUhiZjXp88b/HYFDTjI4QcFDfJk0NAWkQNNygzO035wZcfO79P7iouZFJdEXFSUGLmUQyVDkemHkqNpa4bBgQQsiS7m6kTMAeWrlA88UsCclo/aFiVZBMxpg2tLdl0GEoylgW/08Hrku/iXDTA2ILlz32usPi3aoBBvKlxMAucBJ4DiFkWVJPxQS4HPGwwaswIw6PYDIk8ElPYlpJTIitf+TuPuZ7SEmfTt7ED8AeJEWEKZYl6b3Oj39A3XSziYzp20hJT9JOQrNeQuqlR8NppR7oaxgSE3FHzs86uMODiOeNddFWAdGXSgvby5d26QHW1eMklehteZXY6enTA2YGvjhzbzwp/SUBaVkOGZj+AfaBKmzf3xKy3bv3M3W1xUBX7f6OaEvjPEcH7s7z/t7WvZL1nPvTdwrvkzgEOUgUyoz1FtC/8KmnUyOph7D60AAAAASUVORK5CYII=" alt="iLEAD Logo" class="institute-logo">
                {% endif %}
            </div>
        </div>
    </header>

    <section class="resume-section">
        <h2 class="section-title">CAREER OBJECTIVE</h2>
        <p class="summary-text">{{ summary|default:"(Sample: A motivated and enthusiastic undergraduate student seeking opportunities to apply academic knowledge, develop professional skills, and contribute effectively to organizational goals while gaining industry exposure.)" }}</p>
    </section>

    <section class="resume-section">
        <table class="education-table">
            <thead>
                <tr>
                    <th><u>Qualification</u></th>
                    <th><u>Institution</u></th>
                    <th><u>Board/University</u></th>
                    <th><u>Year</u></th>
                    <th><u>CGPA/%</u></th>
                </tr>
            </thead>
            <tbody>
                {% if education %}
                    {% for edu in education %}
                    <tr>
                        <td class="bold-text">{{ edu.degree }}</td>
                        <td>
                            {% if edu.institution %}
                                {{ edu.institution }}
                            {% else %}
                                {% if "UG" in edu.degree %}iLEAD{% else %}School Name{% endif %}
                            {% endif %}
                        </td>
                        <td>
                            {% if edu.field %}
                                {{ edu.field }}
                            {% else %}
                                {% if "UG" in edu.degree %}MAKAUT{% else %}Board{% endif %}
                            {% endif %}
                        </td>
                        <td>
                            {% if edu.graduation_date %}
                                {% if "UG" in edu.degree %}
                                    {{ edu.graduation_date|slice:":4"|add:"-3" }} – Present
                                {% else %}
                                    {{ edu.graduation_date|slice:":4" }}
                                {% endif %}
                            {% else %}
                                {% if "UG" in edu.degree %}20XX – Present{% else %}Year{% endif %}
                            {% endif %}
                        </td>
                        <td class="bold-text">
                            {% if edu.gpa %}
                                {{ edu.gpa }}
                            {% else %}
                                {% if "UG" in edu.degree %}X.XX CGPA{% else %}XX%{% endif %}
                            {% endif %}
                        </td>
                    </tr>
                    {% endfor %}
                {% else %}
                    <tr>
                        <td class="bold-text">UG Degree (Specialization)</td>
                        <td>iLEAD</td>
                        <td>MAKAUT</td>
                        <td>20XX – Present</td>
                        <td class="bold-text">X.XX CGPA</td>
                    </tr>
                    <tr>
                        <td class="bold-text">Class XII</td>
                        <td>School Name</td>
                        <td>Board</td>
                        <td>Year</td>
                        <td class="bold-text">XX%</td>
                    </tr>
                    <tr>
                        <td class="bold-text">Class X</td>
                        <td>School Name</td>
                        <td>Board</td>
                        <td>Year</td>
                        <td class="bold-text">XX%</td>
                    </tr>
                {% endif %}
            </tbody>
        </table>
    </section>

    <table class="two-col-table">
        <tr>
            <td class="left-col">
                <div class="sidebar-section">
                    <h3 class="section-title">TECHNICAL SKILLS</h3>
                    <ul class="bullet-list">
                        {% if skills %}
                            {% for skill_group in skills %}
                                {% for item in skill_group.items %}
                                    <li>{{ item }}</li>
                                {% endfor %}
                            {% endfor %}
                        {% else %}
                            <li>MS Office Suite (Excel, Word, PowerPoint)</li>
                            <li>Industry-Specific Software (if applicable)</li>
                            <li>AI Tools (ChatGPT, Gemini, Canva AI, etc.)</li>
                            <li>Data Analysis / Design / Programming Tools</li>
                        {% endif %}
                    </ul>
                </div>

                {% if certifications %}
                <div class="sidebar-section">
                    <h3 class="section-title">CERTIFICATIONS <i>(if any)</i></h3>
                    <ul class="bullet-list">
                        {% for cert in certifications %}
                            <li>{{ cert.name }}{% if cert.issuer %} – {{ cert.issuer }}{% endif %}</li>
                        {% endfor %}
                    </ul>
                </div>
                {% else %}
                <div class="sidebar-section">
                    <h3 class="section-title">CERTIFICATIONS <i>(if any)</i></h3>
                    <ul class="bullet-list">
                        <li>Certification – Issuing Organization</li>
                        <li>Certification – Issuing Organization</li>
                    </ul>
                </div>
                {% endif %}

                {% if languages %}
                <div class="sidebar-section">
                    <h3 class="section-title">LANGUAGES KNOWN</h3>
                    <ul class="bullet-list">
                        {% for lang in languages %}
                            <li>{{ lang }}</li>
                        {% endfor %}
                    </ul>
                </div>
                {% endif %}

                {% if strengths %}
                <div class="sidebar-section">
                    <h3 class="section-title">STRENGTHS</h3>
                    <ul class="bullet-list">
                        {% for s in strengths %}
                            <li>{{ s }}</li>
                        {% endfor %}
                    </ul>
                </div>
                {% endif %}
            </td>
            <td class="right-col">
                <div class="main-section">
                    <h3 class="section-title">EXPERIENCE</h3>
                    {% if experience %}
                        {% for exp in experience %}
                        <div class="experience-item">
                            <div class="exp-header">
                                <span class="company-name">{{ exp.company }}</span> |
                                <span class="designation"> {{ exp.position }}</span> |
                                <span class="duration">
                                    ({% if exp.duration.start_formatted %}{{ exp.duration.start_formatted }}{% else %}{{ exp.start_date_formatted|default:"" }}{% endif %}
                                    –
                                    {% if exp.duration.current or not exp.duration.end %}Present{% else %}{{ exp.duration.end_formatted }}{% endif %})
                                </span>
                            </div>
                            {% if exp.achievements %}
                            <ul class="bullet-list">
                                {% for achievement in exp.achievements %}
                                <li>{{ achievement }}</li>
                                {% endfor %}
                            </ul>
                            {% elif exp.description %}
                            <p class="exp-desc">{{ exp.description }}</p>
                            {% endif %}
                        </div>
                        {% endfor %}
                    {% else %}
                        {% for i in "123" %}
                        <div class="experience-item">
                            <div class="exp-header">
                                <span class="company-name">Company Name</span> |
                                <span class="designation"> Designation</span> |
                                <span class="duration"> Internship (Month Year – Month Year)</span>
                            </div>
                            <ul class="bullet-list">
                                <li>Responsibility/Achievement 1</li>
                                <li>Responsibility/Achievement 2</li>
                                <li>Responsibility/Achievement 3</li>
                            </ul>
                        </div>
                        {% endfor %}
                    {% endif %}
                </div>
            </td>
        </tr>
    </table>

    <div class="full-width-section">
        <h3 class="section-title">ACHIEVEMENTS &amp; POSITIONS OF RESPONSIBILITY</h3>
        {% if achievements %}
            <table class="horiz-list">
                <tr>
                    <td style="width: 50%;">
                        <ul class="bullet-list">
                            {% for ach in achievements %}
                                {% if not forloop.counter|divisibleby:2 %}
                                    <li>
                                        <strong>{{ ach.title }}</strong>{% if ach.issuer %} – {{ ach.issuer }}{% endif %}
                                        {% if ach.description %}<span class="ach-desc"> – {{ ach.description }}</span>{% endif %}
                                    </li>
                                {% endif %}
                            {% endfor %}
                        </ul>
                    </td>
                    <td style="width: 50%;">
                        <ul class="bullet-list">
                            {% for ach in achievements %}
                                {% if forloop.counter|divisibleby:2 %}
                                    <li>
                                        <strong>{{ ach.title }}</strong>{% if ach.issuer %} – {{ ach.issuer }}{% endif %}
                                        {% if ach.description %}<span class="ach-desc"> – {{ ach.description }}</span>{% endif %}
                                    </li>
                                {% endif %}
                            {% endfor %}
                        </ul>
                    </td>
                </tr>
            </table>
        {% else %}
            <table class="horiz-list">
                <tr>
                    <td style="width: 50%;">
                        <ul class="bullet-list">
                            <li>Achievement/Award – Organizing body/Institution</li>
                        </ul>
                    </td>
                    <td style="width: 50%;">
                        <ul class="bullet-list">
                            <li>Club Coordinator / Event Volunteer / Team Lead – Institution</li>
                        </ul>
                    </td>
                </tr>
            </table>
        {% endif %}
    </div>

    <div class="full-width-section">
        <h3 class="section-title">EXTRA-CURRICULAR ACTIVITIES</h3>
        {% if extra_curricular %}
            <table class="horiz-list">
                <tr>
                    <td style="width: 50%;">
                        <ul class="bullet-list">
                            {% for activity in extra_curricular %}
                                {% if not forloop.counter|divisibleby:2 %}
                                    <li>{{ activity }}</li>
                                {% endif %}
                            {% endfor %}
                        </ul>
                    </td>
                    <td style="width: 50%;">
                        <ul class="bullet-list">
                            {% for activity in extra_curricular %}
                                {% if forloop.counter|divisibleby:2 %}
                                    <li>{{ activity }}</li>
                                {% endif %}
                            {% endfor %}
                        </ul>
                    </td>
                </tr>
            </table>
        {% else %}
            <table class="horiz-list">
                <tr>
                    <td style="width: 50%;">
                        <ul class="bullet-list">
                            <li>Event Volunteer / Club Member / Sports / Cultural Activity</li>
                        </ul>
                    </td>
                    <td style="width: 50%;">
                        <ul class="bullet-list">
                            <li>NSS / NCC / Community Service</li>
                        </ul>
                    </td>
                </tr>
            </table>
        {% endif %}
    </div>

    <footer class="resume-footer">
        Campus: 113, Matheswartola Road, Kolkata 700 046, West Bengal, India, Ph: +91.33.4018 2000/02 Fax: +91.33.4018 2016
    </footer>
</div>"""

    css_styles = """:root {
    --primary-color: #1F4E79;
    --text-color: #1a1a1a;
    --muted-color: #555555;
    --border-color: #1F4E79;
    --bg-light: #EBF2F7;
}

@page {
    size: A4;
    margin: 12mm 14mm 10mm 14mm;
}

body {
    font-family: Arial, Helvetica, sans-serif;
    color: var(--text-color);
    line-height: 1.3;
    margin: 0;
    padding: 0;
    font-size: 9pt;
}

.resume-container {
    max-width: 100%;
}

.resume-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 2px solid var(--primary-color);
    padding-bottom: 6px;
    margin-bottom: 8px;
}

.header-left {
    flex: 0 0 80px;
}

.photo-frame {
    width: 80px;
    height: 80px;
    border-radius: 50%;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    border: 1.5px dashed #000000;
    background-color: #f8fafc;
}

.candidate-photo {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.photo-placeholder {
    font-size: 7pt;
    color: var(--primary-color);
    padding: 4px;
    line-height: 1.2;
    font-weight: bold;
    text-align: center;
}

.header-center {
    flex: 1;
    text-align: center;
    padding: 0 8px;
}

.candidate-name {
    font-size: 14pt;
    font-weight: bold;
    color: var(--primary-color);
    margin: 0 0 2px 0;
}

.linkedin-link, .portfolio-link {
    font-size: 8.5pt;
    margin-bottom: 1px;
}

.linkedin-link a, .portfolio-link a {
    color: #0077b5;
    text-decoration: none;
}

.linkedin-link a:hover, .portfolio-link a:hover {
    text-decoration: underline;
}

.placeholder-link {
    color: #dc2626 !important;
    font-weight: bold;
}

.contact-row {
    font-size: 8.5pt;
    margin-top: 3px;
    color: #333333;
}

.icon-circle {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    border: 1px solid #333333;
    margin-right: 2px;
    vertical-align: middle;
    background-color: transparent;
}

.icon-circle svg {
    width: 7px;
    height: 7px;
    color: #333333;
    vertical-align: middle;
    display: block;
}

.header-right {
    flex: 0 0 100px;
    display: flex;
    justify-content: flex-end;
}

.logo-container {
    width: 100px;
    height: auto;
}

.institute-logo {
    width: 100%;
    max-height: 50px;
    object-fit: contain;
}

.resume-section {
    margin-bottom: 7px;
    page-break-inside: avoid;
}

.section-title {
    font-size: 9pt;
    font-weight: bold;
    color: var(--primary-color);
    text-transform: uppercase;
    margin: 0 0 3px 0;
    letter-spacing: 0.5px;
    border-bottom: 0.5px solid #c8d8e8;
    padding-bottom: 1px;
}

.summary-text {
    font-size: 9pt;
    text-align: justify;
    margin: 0;
    line-height: 1.3;
}

.education-table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 7px;
    font-size: 8.5pt;
}

.education-table th, .education-table td {
    border: 1px solid var(--border-color);
    padding: 3px 5px;
    text-align: center;
}

.education-table th {
    background-color: transparent;
    color: var(--primary-color);
    font-weight: bold;
    text-transform: uppercase;
    font-size: 8.5pt;
    text-decoration: underline;
}

.education-table tbody tr:nth-child(odd) {
    background-color: var(--bg-light);
}

.education-table tbody tr:nth-child(even) {
    background-color: #ffffff;
}

.bold-text {
    font-weight: bold;
}

.two-col-table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 7px;
}

.left-col {
    width: 37%;
    vertical-align: top;
    padding-right: 10px;
}

.right-col {
    width: 63%;
    vertical-align: top;
    padding-left: 10px;
    border-left: 1.5px solid var(--primary-color);
}

.sidebar-section, .main-section {
    margin-bottom: 7px;
    page-break-inside: avoid;
}

.bullet-list {
    margin: 2px 0 0 0;
    padding-left: 12px;
    font-size: 8.5pt;
}

.bullet-list li {
    margin-bottom: 1.5px;
    line-height: 1.3;
}

.bullet-list li::marker {
    color: var(--primary-color);
    font-size: 8pt;
}

.ach-desc {
    font-size: 8pt;
    color: var(--muted-color);
    margin-top: 1px;
    line-height: 1.2;
}

.experience-item {
    margin-bottom: 6px;
    page-break-inside: avoid;
}

.exp-header {
    font-size: 9pt;
    margin-bottom: 2px;
    line-height: 1.3;
}

.company-name {
    color: var(--primary-color);
    font-weight: bold;
}

.designation {
    color: var(--text-color);
    font-weight: bold;
}

.duration {
    color: var(--muted-color);
    font-weight: normal;
    font-size: 8.5pt;
}

.exp-desc {
    font-size: 9pt;
    margin: 2px 0 0 0;
    text-align: justify;
}

.full-width-section {
    margin-top: 5px;
    margin-bottom: 5px;
    page-break-inside: avoid;
}

.horiz-list {
    width: 100%;
    table-layout: fixed;
}

.horiz-list td {
    vertical-align: top;
    padding-right: 10px;
    font-size: 8.5pt;
}

.ach-desc {
    font-size: 8pt;
    color: var(--muted-color);
    font-weight: normal;
    font-style: italic;
}

.resume-footer {
    text-align: center;
    font-size: 7.5pt;
    color: var(--muted-color);
    margin-top: 12px;
    border-top: 1px solid var(--primary-color);
    padding-top: 4px;
    line-height: 1.3;
    page-break-inside: avoid;
}"""

    template, created = ResumeTemplate.objects.get_or_create(
        name=name,
        defaults={
            'description': description,
            'html_template': html_template,
            'css_styles': css_styles,
            'is_active': True
        }
    )
    
    if created:
        print(f"Created template: {name}")
    else:
        # Update template fields
        template.html_template = html_template
        template.css_styles = css_styles
        template.description = description
        template.save()
        print(f"Updated template: {name}")


if __name__ == "__main__":
    seed_modern_template()
    seed_ilead_kolkata_template()

