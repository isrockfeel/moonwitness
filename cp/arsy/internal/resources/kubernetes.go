package resources

import (
	"context"
	"encoding/json"
	"fmt"
	"sort"
	"strconv"
	"strings"

	"github.com/isrockfeel/moonwitness/cp/arsy/internal/host"
)

// Kubernetes mengelola resource Kubernetes (deployment, service, pod, ingress)
// lewat CLI kubectl.
type Kubernetes struct {
	Runner host.Runner
}

func (k *Kubernetes) Kind() string { return "kubernetes" }

func (k *Kubernetes) ObsKey(r Resource) string {
	return r.ResourceType + ":" + r.Name
}

func (k *Kubernetes) Validate(r Resource) error {
	if r.Name == "" {
		return fmt.Errorf("%w: kubernetes butuh name", ErrBadResource)
	}
	switch r.ResourceType {
	case "deployment", "service", "pod", "ingress", "namespace", "configmap", "secret", "pvc":
	default:
		return fmt.Errorf("%w: resource_type kubernetes %q tidak dikenal", ErrBadResource, r.ResourceType)
	}
	switch r.State {
	case "", "present", "absent":
	default:
		return fmt.Errorf("%w: state kubernetes %q tidak dikenal", ErrBadResource, r.State)
	}
	if orDefault(r.State, "present") == "present" {
		switch r.ResourceType {
		case "deployment", "pod":
			if r.Image == "" {
				return fmt.Errorf("%w: kubernetes %s %q butuh image", ErrBadResource, r.ResourceType, r.Name)
			}
		case "service":
			if r.Port == "" {
				return fmt.Errorf("%w: kubernetes service %q butuh port", ErrBadResource, r.Name)
			}
		case "ingress":
			if r.Host == "" {
				return fmt.Errorf("%w: kubernetes ingress %q butuh host", ErrBadResource, r.Name)
			}
		case "configmap", "secret", "pvc", "namespace":
			// manifest or data/size fields may be provided; minimal validation
		}
	}
	return nil
}

// kubeItem adalah representasi minimal resource Kubernetes dari kubectl -o json.
type kubeItem struct {
	Kind     string `json:"kind"`
	Metadata struct {
		Name string `json:"name"`
	} `json:"metadata"`
	Spec struct {
		Replicas *int32 `json:"replicas,omitempty"`
		Template struct {
			Spec struct {
				Containers []struct {
					Image string `json:"image"`
				} `json:"containers"`
			} `json:"spec"`
		} `json:"template,omitempty"`
		Containers []struct {
			Image string `json:"image"`
		} `json:"containers,omitempty"`
		Type  string `json:"type,omitempty"`
		Ports []struct {
			Port       int32  `json:"port"`
			TargetPort string `json:"targetPort"`
		} `json:"ports,omitempty"`
		Rules []struct {
			Host string `json:"host"`
			HTTP struct {
				Paths []struct {
					Path string `json:"path"`
					Backend struct {
						Service struct {
							Name string `json:"name"`
							Port struct {
								Number int32 `json:"number"`
							} `json:"port"`
						} `json:"service"`
					} `json:"backend"`
				} `json:"paths"`
			} `json:"http"`
		} `json:"rules,omitempty"`
		TLS []struct {
			SecretName string `json:"secretName"`
		} `json:"tls,omitempty"`
	} `json:"spec"`
	Status struct {
		Phase string `json:"phase"`
	} `json:"status"`
}

func (k *Kubernetes) Observe(ctx context.Context) (map[string]Observation, error) {
	// Try extended get; fall back to base types for compatibility.
	queries := [][]string{
		{"get", "deployment,service,pod,ingress,namespace,configmap,secret,pvc", "-A", "-o", "json"},
		{"get", "deployment,service,pod,ingress", "-o", "json"},
	}
	var lastErr error
	for _, args := range queries {
		res, err := k.Runner.Run(ctx, host.Command{Name: "kubectl", Args: args})
		if err != nil {
			lastErr = err
			continue
		}
		var list struct {
			Items []kubeItem `json:"items"`
		}
		if err := json.Unmarshal([]byte(res.Stdout), &list); err != nil {
			lastErr = fmt.Errorf("parse output kubectl: %w", err)
			continue
		}

		out := map[string]Observation{}
		for _, item := range list.Items {
			kind := strings.ToLower(item.Kind)
			key := kind + ":" + item.Metadata.Name
			fields := map[string]string{}

			switch kind {
			case "deployment":
				if item.Spec.Replicas != nil {
					fields["replicas"] = strconv.Itoa(int(*item.Spec.Replicas))
				}
				if len(item.Spec.Template.Spec.Containers) > 0 {
					fields["image"] = item.Spec.Template.Spec.Containers[0].Image
				}
			case "service":
				fields["type"] = item.Spec.Type
				if len(item.Spec.Ports) > 0 {
					fields["port"] = strconv.Itoa(int(item.Spec.Ports[0].Port))
					fields["target_port"] = item.Spec.Ports[0].TargetPort
				}
			case "pod":
				if len(item.Spec.Containers) > 0 {
					fields["image"] = item.Spec.Containers[0].Image
				}
				fields["phase"] = item.Status.Phase
			case "ingress":
				if len(item.Spec.Rules) > 0 {
					fields["host"] = item.Spec.Rules[0].Host
				}
				if len(item.Spec.TLS) > 0 {
					fields["tls"] = item.Spec.TLS[0].SecretName
				}
			}

			out[key] = Observation{Exists: true, Fields: fields, Detail: kind}
		}
		return out, nil
	}
	return nil, lastErr
}

func (k *Kubernetes) Plan(r Resource, obs Observation) (Change, error) {
	c := Change{Kind: k.Kind(), ID: r.ID(), Target: r.ResourceType + ":" + r.Name}

	if r.State == "absent" {
		if !obs.Exists {
			c.Action = ActionNone
			return c, nil
		}
		c.Action = ActionDelete
		return c, nil
	}

	if !obs.Exists {
		c.Action = ActionCreate
		c.Fields = append(c.Fields, FieldDiff{Field: "state", Have: "missing", Want: "present"})
		return c, nil
	}

	switch r.ResourceType {
	case "deployment":
		if r.Image != "" && obs.Fields["image"] != r.Image {
			c.Fields = append(c.Fields, FieldDiff{Field: "image", Have: obs.Fields["image"], Want: r.Image})
		}
		wantReplicas := r.Replicas
		if wantReplicas == 0 {
			wantReplicas = 1
		}
		haveReplicas, _ := strconv.Atoi(obs.Fields["replicas"])
		if haveReplicas != wantReplicas {
			c.Fields = append(c.Fields, FieldDiff{Field: "replicas", Have: obs.Fields["replicas"], Want: strconv.Itoa(wantReplicas)})
		}
	case "service":
		if r.ServiceType != "" && obs.Fields["type"] != r.ServiceType {
			c.Fields = append(c.Fields, FieldDiff{Field: "type", Have: obs.Fields["type"], Want: r.ServiceType})
		}
		if r.Port != "" && obs.Fields["port"] != r.Port {
			c.Fields = append(c.Fields, FieldDiff{Field: "port", Have: obs.Fields["port"], Want: r.Port})
		}
		if r.TargetPort != "" && obs.Fields["target_port"] != r.TargetPort {
			c.Fields = append(c.Fields, FieldDiff{Field: "target_port", Have: obs.Fields["target_port"], Want: r.TargetPort})
		}
	case "pod":
		if r.Image != "" && obs.Fields["image"] != r.Image {
			c.Fields = append(c.Fields, FieldDiff{Field: "image", Have: obs.Fields["image"], Want: r.Image})
		}
	case "ingress":
		if r.Host != "" && obs.Fields["host"] != r.Host {
			c.Fields = append(c.Fields, FieldDiff{Field: "host", Have: obs.Fields["host"], Want: r.Host})
		}
		if r.TLS != "" && obs.Fields["tls"] != r.TLS {
			c.Fields = append(c.Fields, FieldDiff{Field: "tls", Have: obs.Fields["tls"], Want: r.TLS})
		}
	}

	if len(c.Fields) == 0 {
		c.Action = ActionNone
	} else {
		c.Action = ActionUpdate
	}
	return c, nil
}

func (k *Kubernetes) Apply(ctx context.Context, r Resource) error {
	if r.State == "absent" {
		_, err := k.Runner.Run(ctx, host.Command{
			Name: "kubectl",
			Args: []string{"delete", r.ResourceType, r.Name, "--ignore-not-found"},
		})
		return err
	}

	manifest := k.buildManifest(r)
	_, err := k.Runner.Run(ctx, host.Command{
		Name:  "kubectl",
		Args:  []string{"apply", "-f", "-"},
		Stdin: manifest,
	})
	return err
}

func (k *Kubernetes) buildManifest(r Resource) string {
	if r.Manifest != "" {
		return r.Manifest
	}
	switch r.ResourceType {
	case "deployment":
		return k.buildDeployment(r)
	case "service":
		return k.buildService(r)
	case "pod":
		return k.buildPod(r)
	case "ingress":
		return k.buildIngress(r)
	case "namespace":
		return k.buildNamespace(r)
	case "configmap":
		return k.buildConfigMap(r)
	case "secret":
		return k.buildSecret(r)
	case "pvc":
		return k.buildPVC(r)
	}
	return ""
}

func (k *Kubernetes) buildNamespace(r Resource) string {
	return fmt.Sprintf("apiVersion: v1\nkind: Namespace\nmetadata:\n  name: %s\n", r.Name)
}

func (k *Kubernetes) buildConfigMap(r Resource) string {
	var b strings.Builder
	b.WriteString("apiVersion: v1\nkind: ConfigMap\nmetadata:\n")
	fmt.Fprintf(&b, "  name: %s\n", r.Name)
	if r.Namespace != "" {
		fmt.Fprintf(&b, "  namespace: %s\n", r.Namespace)
	}
	if len(r.Data) > 0 {
		b.WriteString("data:\n")
		keys := make([]string, 0, len(r.Data))
		for k2 := range r.Data {
			keys = append(keys, k2)
		}
		sort.Strings(keys)
		for _, k2 := range keys {
			fmt.Fprintf(&b, "  %s: %q\n", k2, r.Data[k2])
		}
	}
	return b.String()
}

func (k *Kubernetes) buildSecret(r Resource) string {
	var b strings.Builder
	b.WriteString("apiVersion: v1\nkind: Secret\nmetadata:\n")
	fmt.Fprintf(&b, "  name: %s\n", r.Name)
	if r.Namespace != "" {
		fmt.Fprintf(&b, "  namespace: %s\n", r.Namespace)
	}
	b.WriteString("type: Opaque\n")
	if len(r.Data) > 0 {
		b.WriteString("stringData:\n")
		keys := make([]string, 0, len(r.Data))
		for k2 := range r.Data {
			keys = append(keys, k2)
		}
		sort.Strings(keys)
		for _, k2 := range keys {
			fmt.Fprintf(&b, "  %s: %q\n", k2, r.Data[k2])
		}
	}
	return b.String()
}

func (k *Kubernetes) buildPVC(r Resource) string {
	var b strings.Builder
	b.WriteString("apiVersion: v1\nkind: PersistentVolumeClaim\nmetadata:\n")
	fmt.Fprintf(&b, "  name: %s\n", r.Name)
	if r.Namespace != "" {
		fmt.Fprintf(&b, "  namespace: %s\n", r.Namespace)
	}
	b.WriteString("spec:\n  accessModes:\n  - ReadWriteOnce\n  resources:\n    requests:\n")
	size := r.MemoryLimit
	if size == "" {
		size = "1Gi"
	}
	fmt.Fprintf(&b, "      storage: %s\n", size)
	return b.String()
}

func (k *Kubernetes) buildDeployment(r Resource) string {
	replicas := r.Replicas
	if replicas == 0 {
		replicas = 1
	}
	var b strings.Builder
	b.WriteString("apiVersion: apps/v1\n")
	b.WriteString("kind: Deployment\n")
	b.WriteString("metadata:\n")
	fmt.Fprintf(&b, "  name: %s\n", r.Name)
	b.WriteString("spec:\n")
	fmt.Fprintf(&b, "  replicas: %d\n", replicas)
	b.WriteString("  selector:\n")
	b.WriteString("    matchLabels:\n")
	fmt.Fprintf(&b, "      app: %s\n", r.Name)
	b.WriteString("  template:\n")
	b.WriteString("    metadata:\n")
	b.WriteString("      labels:\n")
	fmt.Fprintf(&b, "        app: %s\n", r.Name)
	b.WriteString("    spec:\n")
	b.WriteString("      containers:\n")
	b.WriteString("      - name: " + r.Name + "\n")
	fmt.Fprintf(&b, "        image: %s\n", r.Image)
	if len(r.Ports) > 0 {
		b.WriteString("        ports:\n")
		for _, p := range r.Ports {
			port := containerPort(p)
			fmt.Fprintf(&b, "        - containerPort: %s\n", port)
		}
	}
	return b.String()
}

func (k *Kubernetes) buildService(r Resource) string {
	svcType := r.ServiceType
	if svcType == "" {
		svcType = "ClusterIP"
	}
	target := r.TargetPort
	if target == "" {
		target = r.Port
	}
	var b strings.Builder
	b.WriteString("apiVersion: v1\n")
	b.WriteString("kind: Service\n")
	b.WriteString("metadata:\n")
	fmt.Fprintf(&b, "  name: %s\n", r.Name)
	b.WriteString("spec:\n")
	fmt.Fprintf(&b, "  type: %s\n", svcType)
	b.WriteString("  selector:\n")
	fmt.Fprintf(&b, "    app: %s\n", r.Name)
	b.WriteString("  ports:\n")
	b.WriteString("  - port: " + r.Port + "\n")
	fmt.Fprintf(&b, "    targetPort: %s\n", target)
	return b.String()
}

func (k *Kubernetes) buildPod(r Resource) string {
	var b strings.Builder
	b.WriteString("apiVersion: v1\n")
	b.WriteString("kind: Pod\n")
	b.WriteString("metadata:\n")
	fmt.Fprintf(&b, "  name: %s\n", r.Name)
	b.WriteString("spec:\n")
	b.WriteString("  containers:\n")
	b.WriteString("  - name: " + r.Name + "\n")
	fmt.Fprintf(&b, "    image: %s\n", r.Image)
	if len(r.Ports) > 0 {
		b.WriteString("    ports:\n")
		for _, p := range r.Ports {
			port := containerPort(p)
			fmt.Fprintf(&b, "    - containerPort: %s\n", port)
		}
	}
	return b.String()
}

func (k *Kubernetes) buildIngress(r Resource) string {
	var b strings.Builder
	b.WriteString("apiVersion: networking.k8s.io/v1\n")
	b.WriteString("kind: Ingress\n")
	b.WriteString("metadata:\n")
	fmt.Fprintf(&b, "  name: %s\n", r.Name)
	b.WriteString("spec:\n")
	b.WriteString("  rules:\n")
	b.WriteString("  - host: " + r.Host + "\n")
	b.WriteString("    http:\n")
	b.WriteString("      paths:\n")

	// Backend rules: map path -> "service:port". Default ke "/" -> name:port.
	rules := r.BackendRules
	if len(rules) == 0 {
		rules = map[string]string{"/": r.Name + ":" + r.Port}
	}
	paths := make([]string, 0, len(rules))
	for p := range rules {
		paths = append(paths, p)
	}
	sort.Strings(paths)
	for _, p := range paths {
		backend := rules[p]
		svc, port := splitBackend(backend)
		b.WriteString("      - path: " + p + "\n")
		b.WriteString("        pathType: Prefix\n")
		b.WriteString("        backend:\n")
		b.WriteString("          service:\n")
		fmt.Fprintf(&b, "            name: %s\n", svc)
		fmt.Fprintf(&b, "            port:\n")
		fmt.Fprintf(&b, "              number: %s\n", port)
	}

	if r.TLS != "" {
		b.WriteString("  tls:\n")
		b.WriteString("  - hosts:\n")
		fmt.Fprintf(&b, "    - %s\n", r.Host)
		fmt.Fprintf(&b, "    secretName: %s\n", r.TLS)
	}
	return b.String()
}

// containerPort mengekstrak port container dari entri ports.
// Format yang diterima: "8080" atau "80:8080" (host:container).
func containerPort(entry string) string {
	if i := strings.Index(entry, ":"); i >= 0 {
		return entry[i+1:]
	}
	return entry
}

// splitBackend memecah "service:port" menjadi nama service dan port.
func splitBackend(backend string) (string, string) {
	if i := strings.Index(backend, ":"); i >= 0 {
		return backend[:i], backend[i+1:]
	}
	return backend, "80"
}